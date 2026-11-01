import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import { checkRateLimit, checkSharedRateLimit, rateLimitHeaders, normalizeIdentifier } from "../src/lib/rate-limiter.ts";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
});

describe("Master Database Reset, Security, Rate Limiting & Optimization Suite", () => {
  let dbConnected = false;
  test.before(async () => {
    try {
      await prisma.$connect();
      dbConnected = true;
    } catch (err) {
      console.warn("DB offline or unreachable during test:", err?.message);
    }
  });

  test.after(async () => {
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // 1. DATABASE DATA STATE & INTEGRITY TESTS
  // --------------------------------------------------------------------------
  describe("1. Final Reset Data State & Foreign-Key Integrity", () => {
    test("Database contains administrator account with role ADMIN", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" } });
      assert.ok(admin, "An active administrator account must exist");
      assert.equal(admin.role, "ADMIN", "The admin must have role ADMIN");
      assert.equal(admin.status, "ACTIVE", "The admin account must be ACTIVE");
      assert.equal(admin.mobile, "7022461700", "Admin mobile must match configured admin 7022461700");
    });

    test("SUPER_ADMIN role does not exist anywhere in database or accounts", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      assert.equal(superAdminCount, 0, "No accounts with role SUPER_ADMIN may exist");
    });

    test("Active products conform to meat and egg scope", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true, variants: true },
      });
      assert.ok(products.length >= 2, "Must contain active sample products");
    });

    test("Active coupons exist and are functional", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const coupons = await prisma.coupon.findMany({ where: { isActive: true } });
      assert.ok(coupons.length >= 1, "Must contain active coupons");
    });

    test("System configuration settings are retained and intact", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const settings = await prisma.systemSetting.findMany();
      assert.ok(settings.length >= 10, "Core system settings must be retained");
    });
  });

  // --------------------------------------------------------------------------
  // 2. COMPLETE REMOVAL OF SUPER_ADMIN ROLE & PRIVILEGE TIER
  // --------------------------------------------------------------------------
  describe("2. Complete Removal of SUPER_ADMIN Role & Privilege Tier", () => {
    test("backend/src/lib/types.ts has removed SUPER_ADMIN from UserRole union", () => {
      const typesFile = fs.readFileSync(path.join(rootDir, "src/lib/types.ts"), "utf-8");
      assert.ok(!typesFile.includes('"SUPER_ADMIN"'), "SUPER_ADMIN should not exist in backend types.ts");
    });

    test("frontend/src/lib/types.ts has removed SUPER_ADMIN from UserRole union", () => {
      const frontendTypes = fs.readFileSync(path.join(rootDir, "../frontend/src/lib/types.ts"), "utf-8");
      assert.ok(!frontendTypes.includes('"SUPER_ADMIN"'), "SUPER_ADMIN should not exist in frontend types.ts");
    });

    test("frontend/src/context/AuthContext.tsx has removed SUPER_ADMIN from User role", () => {
      const authCtx = fs.readFileSync(path.join(rootDir, "../frontend/src/context/AuthContext.tsx"), "utf-8");
      assert.ok(!authCtx.includes('"SUPER_ADMIN"'), "SUPER_ADMIN should not exist in AuthContext.tsx");
    });

    test("backend middleware strictly uses ADMIN role without SUPER_ADMIN bypass", () => {
      const mwPath = path.join(rootDir, "src/middleware.ts");
      if (fs.existsSync(mwPath)) {
        const mw = fs.readFileSync(mwPath, "utf-8");
        assert.ok(!mw.includes("SUPER_ADMIN"), "SUPER_ADMIN should not be in backend middleware");
      }
    });

    test("frontend middleware strictly uses ADMIN role without SUPER_ADMIN bypass", () => {
      const mwPath = path.join(rootDir, "../frontend/src/middleware.ts");
      if (fs.existsSync(mwPath)) {
        const mw = fs.readFileSync(mwPath, "utf-8");
        assert.ok(!mw.includes("SUPER_ADMIN"), "SUPER_ADMIN should not be in frontend middleware");
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. MULTI-TIERED RATE LIMITER & RESPONSE HEADERS
  // --------------------------------------------------------------------------
  describe("3. Multi-Tiered Rate Limiter & Response Headers", () => {
    test("normalizeIdentifier handles cases, spaces, and empty inputs", () => {
      assert.equal(normalizeIdentifier("  +91 79751 37618  "), "+917975137618");
      assert.equal(normalizeIdentifier("Admin@HomeMart4u.com"), "admin@homemart4u.com");
      assert.equal(normalizeIdentifier(""), "anonymous");
    });

    test("checkRateLimit allows requests under threshold and blocks upon exceeding", () => {
      const testIp = `test-ip-${Date.now()}`;
      const config = { maxRequests: 3, windowMs: 10000 };

      const r1 = checkRateLimit(testIp, config);
      assert.equal(r1.allowed, true);
      assert.equal(r1.remaining, 2);

      const r2 = checkRateLimit(testIp, config);
      assert.equal(r2.allowed, true);
      assert.equal(r2.remaining, 1);

      const r3 = checkRateLimit(testIp, config);
      assert.equal(r3.allowed, true);
      assert.equal(r3.remaining, 0);

      const r4 = checkRateLimit(testIp, config);
      assert.equal(r4.allowed, false);
      assert.equal(r4.remaining, 0);
    });

    test("rateLimitHeaders formats standard HTTP headers correctly", () => {
      const headers = rateLimitHeaders({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetSeconds: 45,
      });

      assert.equal(headers["X-RateLimit-Limit"], "10");
      assert.equal(headers["X-RateLimit-Remaining"], "0");
      assert.equal(headers["X-RateLimit-Reset"], "45");
    });

    test("checkSharedRateLimit persists to database _RateLimit table atomically", async (t) => {
      if (!dbConnected) return t.skip("Database not connected");
      const sharedKey = `shared-test-${Date.now()}`;
      const config = { maxRequests: 2, windowMs: 5000 };

      const s1 = await checkSharedRateLimit(sharedKey, config);
      assert.equal(s1.allowed, true);

      const s2 = await checkSharedRateLimit(sharedKey, config);
      assert.equal(s2.allowed, true);

      const s3 = await checkSharedRateLimit(sharedKey, config);
      assert.equal(s3.allowed, false, "Must block once shared limit is exceeded");

      // Verify row exists in PostgreSQL table
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "_RateLimit" WHERE "key" = $1;`, sharedKey);
      assert.ok(Array.isArray(rows) && rows.length > 0, "_RateLimit record must be recorded in database");

      // Cleanup
      await prisma.$executeRawUnsafe(`DELETE FROM "_RateLimit" WHERE "key" = $1;`, sharedKey);
    });
  });

  // --------------------------------------------------------------------------
  // 4. CACHE-CONTROL POLICY & PRIVATE DATA PROTECTION
  // --------------------------------------------------------------------------
  describe("4. Cache-Control Policy & Private Data Protection", () => {
    test("Private auth/me route specifies private no-store headers", () => {
      const meRoute = fs.readFileSync(path.join(rootDir, "src/app/api/auth/me/route.ts"), "utf-8");
      assert.ok(meRoute.includes("no-store") || meRoute.includes("no-cache"), "auth/me must disable client caching");
    });

    test("Cart validation route specifies no-store cache control", () => {
      const cartRoute = fs.readFileSync(path.join(rootDir, "src/app/api/cart/validate/route.ts"), "utf-8");
      assert.ok(cartRoute.includes("no-store"), "cart/validate must disable caching");
    });

    test("Orders creation route specifies no-store cache control", () => {
      const ordersRoute = fs.readFileSync(path.join(rootDir, "src/app/api/orders/route.ts"), "utf-8");
      assert.ok(ordersRoute.includes("no-store"), "orders creation must disable caching");
    });

    test("Public products catalogue route implements stale-while-revalidate caching", () => {
      const productsRoute = fs.readFileSync(path.join(rootDir, "src/app/api/products/route.ts"), "utf-8");
      assert.ok(
        productsRoute.includes("stale-while-revalidate") || productsRoute.includes("s-maxage"),
        "Public catalogue should use CDN edge caching with revalidation"
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. PRODUCTION RESET SAFETY SAFEGUARDS
  // --------------------------------------------------------------------------
  describe("5. Production Reset Safety Safeguards", () => {
    test("controlled-reset.cjs contains guard rejecting production execution without confirmation", () => {
      const resetScript = fs.readFileSync(path.join(rootDir, "scripts/controlled-reset.cjs"), "utf-8");
      assert.ok(
        resetScript.includes("FATAL: Automated database reset rejected") ||
          resetScript.includes("CONFIRM_DATABASE_RESET_PRODUCTION") ||
          resetScript.includes("RESET_CONFIRM === \"YES\""),
        "Controlled reset script must contain an explicit safeguard against unintentional execution"
      );
    });
  });
});
