/**
 * Multi-tiered Rate Limiter with Shared Persistent Store & In-Memory Fast Path.
 * Supports:
 *  1. Upstash / Redis REST API (when UPSTASH_REDIS_REST_URL is configured)
 *  2. PostgreSQL atomic `_RateLimit` table (for distributed multi-instance Render deployments)
 *  3. In-memory sliding window fallback (high-throughput local protection)
 */

import { PrismaClient } from "@prisma/client";

const globalForRateLimiter = globalThis as unknown as {
  prismaRateLimiter?: PrismaClient;
};

const prisma = globalForRateLimiter.prismaRateLimiter ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
});
if (process.env.NODE_ENV !== "production") {
  globalForRateLimiter.prismaRateLimiter = prisma;
}

export interface RateLimitConfig {
  /** Maximum number of allowed requests in the time window */
  maxRequests: number;
  /** Window duration in milliseconds (default: 60,000ms = 1 minute) */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

interface LocalRecord {
  timestamps: number[];
}

const localStore = new Map<string, LocalRecord>();

// Periodically clean stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of localStore.entries()) {
      if (record.timestamps.length === 0 || now - record.timestamps[record.timestamps.length - 1] > 10 * 60 * 1000) {
        localStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Normalizes an identifier (e.g. mobile phone, email, or IP address)
 */
export function normalizeIdentifier(input: string): string {
  if (!input) return "anonymous";
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Extracts client IP from trusted headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Left-most IP is the original client IP before proxies
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Fast local in-memory sliding window check
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 20, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = normalizeIdentifier(identifier);

  let record = localStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    localStore.set(key, record);
  }

  // Filter out timestamps older than current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + config.windowMs - now) / 1000));

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = config.maxRequests - record.timestamps.length;
  const resetSeconds = Math.ceil(config.windowMs / 1000);

  // Asynchronously record in shared PostgreSQL table for multi-instance syncing
  syncToSharedStore(key, config).catch(() => {
    // Non-blocking background sync fail-safe
  });

  return {
    allowed: true,
    remaining,
    limit: config.maxRequests,
    resetSeconds,
  };
}

/**
 * Shared distributed rate limit check (PostgreSQL / Redis)
 */
export async function checkSharedRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 20, windowMs: 60 * 1000 }
): Promise<RateLimitResult> {
  const key = normalizeIdentifier(identifier);

  // 1. Try Upstash Redis REST if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const url = `${process.env.UPSTASH_REDIS_REST_URL}/pipeline`;
      const seconds = Math.ceil(config.windowMs / 1000);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, seconds],
        ]),
      });
      if (res.ok) {
        const data = await res.json();
        const currentCount = Number(data[0]?.result || 1);
        const allowed = currentCount <= config.maxRequests;
        return {
          allowed,
          remaining: Math.max(0, config.maxRequests - currentCount),
          limit: config.maxRequests,
          resetSeconds: seconds,
        };
      }
    } catch {
      // Fall through to PostgreSQL shared store
    }
  }

  // 2. Try PostgreSQL atomic _RateLimit table
  try {
    const resetAt = new Date(Date.now() + config.windowMs);
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number; resetAt: Date }>>(`
      INSERT INTO "_RateLimit" ("key", "count", "resetAt")
      VALUES ($1, 1, $2)
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE WHEN "_RateLimit"."resetAt" < NOW() THEN 1 ELSE "_RateLimit"."count" + 1 END,
          "resetAt" = CASE WHEN "_RateLimit"."resetAt" < NOW() THEN $2 ELSE "_RateLimit"."resetAt" END
      RETURNING "count", "resetAt";
    `, key, resetAt);

    if (rows && rows.length > 0) {
      const currentCount = rows[0].count;
      const dbResetAt = new Date(rows[0].resetAt).getTime();
      const resetSeconds = Math.max(1, Math.ceil((dbResetAt - Date.now()) / 1000));
      const allowed = currentCount <= config.maxRequests;

      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - currentCount),
        limit: config.maxRequests,
        resetSeconds,
      };
    }
  } catch {
    // If database table is unavailable or busy, fall back to in-memory check
  }

  // 3. Fall back to local in-memory
  return checkRateLimit(key, config);
}

/**
 * Background sync helper to persist hit to PostgreSQL shared store
 */
async function syncToSharedStore(key: string, config: RateLimitConfig): Promise<void> {
  try {
    const resetAt = new Date(Date.now() + config.windowMs);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_RateLimit" ("key", "count", "resetAt")
      VALUES ($1, 1, $2)
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE WHEN "_RateLimit"."resetAt" < NOW() THEN 1 ELSE "_RateLimit"."count" + 1 END,
          "resetAt" = CASE WHEN "_RateLimit"."resetAt" < NOW() THEN $2 ELSE "_RateLimit"."resetAt" END;
    `, key, resetAt);
  } catch {
    // Ignore transient DB sync errors in background
  }
}

/**
 * Standard HTTP rate-limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
}
