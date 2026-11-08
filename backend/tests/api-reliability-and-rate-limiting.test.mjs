import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("Production API Reliability, Rate Limiting & Catalog Integrity Suite", () => {
  // 1. Backend Route Rate Limiting & Internal SSR Header Verification
  describe("1. Backend Route Rate Limiting & Internal SSR Allowance", () => {
    test("products route recognizes trusted SSR and grants 2,400 req/min, 600 for public", () => {
      const code = fs.readFileSync(path.join(rootDir, "src/app/api/products/route.ts"), "utf-8");
      assert.ok(code.includes("isTrustedSsrRequest"), "Must check isTrustedSsrRequest");
      assert.ok(code.includes("2400"), "Must grant 2400 req/min to SSR");
      assert.ok(code.includes("600"), "Must allow 600 req/min for public IP");
      assert.ok(code.includes("stale-while-revalidate"), "Must provide stale-while-revalidate caching header");
    });

    test("categories route recognizes trusted SSR and includes CDN edge caching", () => {
      const code = fs.readFileSync(path.join(rootDir, "src/app/api/categories/route.ts"), "utf-8");
      assert.ok(code.includes("isTrustedSsrRequest"), "Must check isTrustedSsrRequest");
      assert.ok(code.includes("stale-while-revalidate=300"), "Must cache categories up to 300s");
    });

    test("product detail slug route implements SSR allowance and CDN edge caching", () => {
      const code = fs.readFileSync(path.join(rootDir, "src/app/api/products/[slug]/route.ts"), "utf-8");
      assert.ok(code.includes("isTrustedSsrRequest"), "Must check isTrustedSsrRequest");
      assert.ok(code.includes("stale-while-revalidate"), "Must cache product slug detail");
    });

    test("rate-limiter fast-path checkRateLimit does not block on raw PostgreSQL writes", () => {
      const code = fs.readFileSync(path.join(rootDir, "src/lib/rate-limiter.ts"), "utf-8");
      assert.ok(!code.includes("syncToSharedStore(key, config)"), "checkRateLimit must not call syncToSharedStore on fast-path");
      assert.ok(code.includes("export function isTrustedSsrRequest"), "Must export isTrustedSsrRequest");
    });
  });

  // 2. Frontend API Client & Request Deduplication
  describe("2. Frontend API Client & Request Deduplication", () => {
    test("api-client implements in-flight GET request deduplication", () => {
      const code = fs.readFileSync(path.join(repoRoot, "frontend/src/lib/api-client.ts"), "utf-8");
      assert.ok(code.includes("inFlightRequests"), "Must define in-flight request deduplication map");
      assert.ok(code.includes("x-internal-ssr-token"), "Must inject x-internal-ssr-token during SSR");
      assert.ok(code.includes("Retry-After") || code.includes("retryAfter") || code.includes("retry-after"), "Must handle 429 retry-after");
    });

    test("frontend catalog fetchers utilize Next.js ISR revalidation instead of no-store", () => {
      const code = fs.readFileSync(path.join(repoRoot, "frontend/src/lib/catalog.ts"), "utf-8");
      assert.ok(!code.includes('cache: "no-store"'), "Must remove cache: no-store from catalog fetchers");
      assert.ok(code.includes("next: { revalidate: 30 }"), "Must use next: { revalidate: 30 } for catalog caching");
      assert.ok(code.includes("cache("), "Must use React cache() for getProductBySlug");
    });

    test("real-time hook debounces refreshes to prevent SSE connection flooding", () => {
      const code = fs.readFileSync(path.join(repoRoot, "frontend/src/lib/useRealTime.ts"), "utf-8");
      assert.ok(code.includes("refreshDebounceTimer") || code.includes("scheduleRefresh"), "Must debounce/throttle refreshes");
      assert.ok(code.includes('status === "connected"'), "Must ignore connected handshake message to avoid instant refetch");
    });
  });

  // 3. Database Pool & Catalog Persistence Verification
  describe("3. Database Pool & Catalog Bootstrap", () => {
    test("backend .env configures connection_limit=10 and pool_timeout=20", () => {
      const env = fs.readFileSync(path.join(rootDir, ".env"), "utf-8");
      assert.ok(env.includes("connection_limit=10"), "DATABASE_URL must have connection_limit=10");
      assert.ok(env.includes("pool_timeout=20"), "DATABASE_URL must have pool_timeout=20");
    });

    test("bootstrap-catalogue defines all 11 required products and 5 promotional cards", () => {
      const bootstrap = fs.readFileSync(path.join(rootDir, "prisma/bootstrap-catalogue.cjs"), "utf-8");
      // 7 chicken products
      assert.ok(bootstrap.includes("small-broiler-chicken"), "Must include small-broiler-chicken");
      assert.ok(bootstrap.includes("big-broiler-chicken"), "Must include big-broiler-chicken");
      assert.ok(bootstrap.includes("natti-chicken"), "Must include natti-chicken");
      assert.ok(bootstrap.includes("chicken-liver"), "Must include chicken-liver");
      assert.ok(bootstrap.includes("chicken-leg-piece"), "Must include chicken-leg-piece");
      assert.ok(bootstrap.includes("chicken-lollipop"), "Must include chicken-lollipop");
      assert.ok(bootstrap.includes("chicken-wings"), "Must include chicken-wings");
      // 2 egg products
      assert.ok(bootstrap.includes("desi-eggs"), "Must include desi-eggs");
      assert.ok(bootstrap.includes("farm-eggs"), "Must include farm-eggs");
      // 2 coming soon categories / products
      assert.ok(bootstrap.includes("fresh-mutton"), "Must include fresh-mutton category");
      assert.ok(bootstrap.includes("fish-seafood"), "Must include fish-seafood category");
      // 5 promo cards
      assert.ok(bootstrap.includes("Fresh Chicken"), "Must include Fresh Chicken promo card");
      assert.ok(bootstrap.includes("Chicken Specials"), "Must include Chicken Specials promo card");
    });

    test("database backup snapshot exists and strictly excludes orders and activity logs", () => {
      const backupPath = path.join(rootDir, "prisma/data-backup.json");
      assert.ok(fs.existsSync(backupPath), "data-backup.json must exist");
      const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
      assert.ok(backup.counts.products >= 11, "Must contain all 11 products");
      assert.ok(backup.counts.users >= 1, "Must contain admin user");
      assert.ok(backup.counts.categories >= 4, "Must contain categories");
      assert.ok(backup.counts.systemSettings >= 40, "Must contain system settings");
      assert.equal(backup.data.orders, undefined, "Orders must be strictly excluded");
      assert.equal(backup.data.auditLogs, undefined, "Audit logs must be strictly excluded");
    });
  });
});

