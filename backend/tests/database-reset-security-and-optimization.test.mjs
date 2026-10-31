import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { checkRateLimit, checkSharedRateLimit, rateLimitHeaders, normalizeIdentifier } from "../src/lib/rate-limiter.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

describe("Master Database Reset, Security, Rate Limiting & Optimization Suite", () => {
  test.before(async () => {
    await prisma.$connect();
  });

  test.after(async () => {
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // 1. DATABASE RESET FINAL STATE TESTS
  // --------------------------------------------------------------------------
  describe("1. Final Reset Data State & Foreign-Key Integrity", () => {
    test("Database contains exactly ONE administrator account with role ADMIN", async () => {
      const users = await prisma.user.findMany({ select: { mobile: true, role: true, status: true } });
      assert.equal(users.length, 1, "There must be exactly 1 user account in the reset database");
      assert.equal(users[0].role, "ADMIN", "The sole user must have role ADMIN");
      assert.equal(users[0].status, "ACTIVE", "The admin account must be ACTIVE");
      assert.equal(users[0].mobile, "7022461700", "Admin mobile must match configured admin");
    });

    test("SUPER_ADMIN role does not exist anywhere in database or accounts", async () => {
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      assert.equal(superAdminCount, 0, "No accounts with role SUPER_ADMIN may exist");
    });

    test("Zero customer and zero delivery-agent accounts remain", async () => {
      const customerCount = await prisma.user.count({ where: { role: "CUSTOMER" } });
      const agentCount = await prisma.user.count({ where: { role: "DELIVERY_AGENT" } });
      assert.equal(customerCount, 0, "Customer accounts must be 0");
      assert.equal(agentCount, 0, "Delivery agent accounts must be 0");
    });

    test("Zero historical orders, payments, bank transactions, and delivery collections remain", async () => {
      const orders = await prisma.order.count();
      const payments = await prisma.payment.count();
      const bankTx = await prisma.bankTransaction.count();
      const collections = await prisma.deliveryCollection.count();
      const assignments = await prisma.deliveryAssignment.count();

      assert.equal(orders, 0, "Historical orders must be 0");
      assert.equal(payments, 0, "Historical payments must be 0");
      assert.equal(bankTx, 0, "Historical bank transactions must be 0");
      assert.equal(collections, 0, "Delivery collections must be 0");
      assert.equal(assignments, 0, "Delivery assignments must be 0");
    });

    test("Zero obsolete audit logs, notifications, reviews, or favorites remain", async () => {
      const logs = await prisma.auditLog.count();
      const broadcasts = await prisma.notificationBroadcast.count();
      const reviews = await prisma.review.count();
      const favorites = await prisma.favorite.count();

      assert.equal(logs, 0, "Audit logs must be 0");
      assert.equal(broadcasts, 0, "Notification broadcasts must be 0");
      assert.equal(reviews, 0, "Reviews must be 0");
      assert.equal(favorites, 0, "Favorites must be 0");
    });

    test("Database contains exactly TWO active sample products conforming to meat & egg scope", async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true, variants: true, customizationGroups: true },
        orderBy: { displayOrder: "asc" },
      });

      assert.equal(products.length, 2, "There must be exactly 2 active sample products");

      // Product 1: Fresh Chicken
      const chicken = products.find((p) => p.category.slug === "fresh-chicken");
      assert.ok(chicken, "Fresh Chicken product must exist in fresh-chicken category");
      assert.ok(chicken.name.toLowerCase().includes("chicken"), "Product 1 name must reflect chicken");
      assert.ok(chicken.variants.length > 0, "Chicken must have active variants");
      assert.ok(chicken.customizationGroups.length >= 2, "Chicken must have customization groups");

      // Product 2: Farm Eggs
      const eggs = products.find((p) => p.category.slug === "eggs");
      assert.ok(eggs, "Farm Eggs product must exist in eggs category");
      assert.ok(eggs.name.toLowerCase().includes("egg"), "Product 2 name must reflect eggs");
      assert.ok(eggs.variants.length > 0, "Eggs must have active pack variants");
    });

    test("Database contains exactly TWO active sample coupons (WELCOME10 and SAVE50)", async () => {
      const coupons = await prisma.coupon.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      });

      assert.equal(coupons.length, 2, "There must be exactly 2 active sample coupons");

      const save50 = coupons.find((c) => c.code === "SAVE50");
      assert.ok(save50, "SAVE50 coupon must exist");
      assert.equal(save50.type, "FIXED");
      assert.equal(save50.value, 50);

      const welcome10 = coupons.find((c) => c.code === "WELCOME10");
      assert.ok(welcome10, "WELCOME10 coupon must exist");
      assert.equal(welcome10.type, "PERCENTAGE");
      assert.equal(welcome10.value, 10);
    });

    test("System configuration settings (21 items) are retained and intact", async () => {
      const settingsCount = await prisma.systemSetting.count();
      assert.ok(settingsCount >= 21, "All 21 essential system settings must be retained");

      const shopPhone = await prisma.systemSetting.findUnique({ where: { key: "SHOP_PHONE" } });
      assert.ok(shopPhone && shopPhone.value.includes("90355"), "Store contact must be preserved");
    });
  });

  // --------------------------------------------------------------------------
  // 2. CODEBASE SUPER_ADMIN ELIMINATION TESTS
  // --------------------------------------------------------------------------
  describe("2. Complete Removal of SUPER_ADMIN Role & Privilege Tier", () => {
    test("backend/src/lib/types.ts has removed SUPER_ADMIN from UserRole union", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/lib/types.ts"), "utf8");
      assert.ok(!content.includes('"SUPER_ADMIN"'), "SUPER_ADMIN must not be in UserRole type");
    });

    test("frontend/src/lib/types.ts has removed SUPER_ADMIN from UserRole union", () => {
      const content = fs.readFileSync(path.join(rootDir, "../frontend/src/lib/types.ts"), "utf8");
      assert.ok(!content.includes('"SUPER_ADMIN"'), "SUPER_ADMIN must not be in frontend types");
    });

    test("frontend/src/context/AuthContext.tsx has removed SUPER_ADMIN from User role", () => {
      const content = fs.readFileSync(path.join(rootDir, "../frontend/src/context/AuthContext.tsx"), "utf8");
      assert.ok(!content.includes('"SUPER_ADMIN"'), "SUPER_ADMIN must not be in AuthContext role");
    });

    test("backend middleware strictly uses ADMIN role without SUPER_ADMIN bypass", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/middleware.ts"), "utf8");
      assert.ok(!content.includes("SUPER_ADMIN"), "Backend middleware must not mention SUPER_ADMIN");
      assert.ok(content.includes('session.role !== "ADMIN"'), "Backend middleware must enforce ADMIN role");
    });

    test("frontend middleware strictly uses ADMIN role without SUPER_ADMIN bypass", () => {
      const content = fs.readFileSync(path.join(rootDir, "../frontend/src/middleware.ts"), "utf8");
      assert.ok(!content.includes("SUPER_ADMIN"), "Frontend middleware must not mention SUPER_ADMIN");
    });
  });

  // --------------------------------------------------------------------------
  // 3. RATE LIMITING & STORAGE BACKEND TESTS
  // --------------------------------------------------------------------------
  describe("3. Multi-Tiered Rate Limiter & Response Headers", () => {
    test("normalizeIdentifier handles cases, spaces, and empty inputs", () => {
      assert.equal(normalizeIdentifier(" 7022 461 700 "), "7022461700");
      assert.equal(normalizeIdentifier("Admin@Homemart4U.in"), "admin@homemart4u.in");
      assert.equal(normalizeIdentifier(""), "anonymous");
    });

    test("checkRateLimit allows requests under threshold and blocks upon exceeding", () => {
      const testKey = `test-unit-${Date.now()}`;
      const config = { maxRequests: 3, windowMs: 10000 };

      const r1 = checkRateLimit(testKey, config);
      assert.equal(r1.allowed, true);
      assert.equal(r1.remaining, 2);

      const r2 = checkRateLimit(testKey, config);
      assert.equal(r2.allowed, true);
      assert.equal(r2.remaining, 1);

      const r3 = checkRateLimit(testKey, config);
      assert.equal(r3.allowed, true);
      assert.equal(r3.remaining, 0);

      const r4 = checkRateLimit(testKey, config);
      assert.equal(r4.allowed, false, "4th request must be blocked");
      assert.equal(r4.remaining, 0);
      assert.ok(r4.resetSeconds > 0, "resetSeconds must be positive");
    });

    test("rateLimitHeaders formats standard HTTP headers correctly", () => {
      const res = { allowed: false, remaining: 0, limit: 5, resetSeconds: 45 };
      const headers = rateLimitHeaders(res);
      assert.equal(headers["X-RateLimit-Limit"], "5");
      assert.equal(headers["X-RateLimit-Remaining"], "0");
      assert.equal(headers["X-RateLimit-Reset"], "45");
    });

    test("checkSharedRateLimit persists to database _RateLimit table atomically", async () => {
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
  // 4. CACHING & PRIVATE DATA ISOLATION TESTS
  // --------------------------------------------------------------------------
  describe("4. Cache-Control Policy & Private Data Protection", () => {
    test("Private auth/me route specifies private no-store headers", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/app/api/auth/me/route.ts"), "utf8");
      assert.ok(content.includes("no-store") && content.includes("private"), "Auth me route must have private no-store cache control");
    });

    test("Cart validation route specifies no-store cache control", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/app/api/cart/validate/route.ts"), "utf8");
      assert.ok(content.includes("no-store"), "Cart validate route must have no-store cache control");
    });

    test("Orders creation route specifies no-store cache control", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/app/api/orders/route.ts"), "utf8");
      assert.ok(content.includes("no-store"), "Orders route must have no-store cache control");
    });

    test("Public products catalogue route implements stale-while-revalidate caching", () => {
      const content = fs.readFileSync(path.join(rootDir, "src/app/api/products/route.ts"), "utf8");
      assert.ok(content.includes("stale-while-revalidate"), "Products route must have stale-while-revalidate cache header");
    });
  });

  // --------------------------------------------------------------------------
  // 5. RESET SCRIPT PRODUCTION SAFEGUARDS
  // --------------------------------------------------------------------------
  describe("5. Production Reset Safety Safeguards", () => {
    test("controlled-reset.cjs contains guard rejecting production execution without confirmation", () => {
      const content = fs.readFileSync(path.join(rootDir, "scripts/controlled-reset.cjs"), "utf8");
      assert.ok(content.includes("RESET_CONFIRM"), "Must check RESET_CONFIRM flag");
      assert.ok(content.includes("--confirm"), "Must support --confirm argument");
      assert.ok(content.includes("SAFETY ABORT"), "Must output safety abort warning when safeguard fails");
    });
  });
});

