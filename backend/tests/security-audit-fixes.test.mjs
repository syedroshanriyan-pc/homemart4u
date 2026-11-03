import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Cloudflare Security Audit Fixes & Vulnerability Hardening Suite", () => {
  const authPath = path.join(rootDir, "src", "lib", "auth.ts");
  const middlewarePath = path.join(rootDir, "src", "middleware.ts");
  const registerPath = path.join(rootDir, "src", "app", "api", "auth", "register", "route.ts");
  const ordersPath = path.join(rootDir, "src", "app", "api", "orders", "route.ts");
  const cartValidatePath = path.join(rootDir, "src", "app", "api", "cart", "validate", "route.ts");
  const adminProductPath = path.join(rootDir, "src", "app", "api", "admin", "products", "[id]", "route.ts");
  const notificationsPath = path.join(rootDir, "src", "app", "api", "admin", "notifications", "broadcast", "route.ts");
  const publicCouponsPath = path.join(rootDir, "src", "app", "api", "coupons", "route.ts");
  const adminCouponsPath = path.join(rootDir, "src", "app", "api", "admin", "coupons", "route.ts");

  const authContent = fs.readFileSync(authPath, "utf-8");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf-8");
  const registerContent = fs.readFileSync(registerPath, "utf-8");
  const ordersContent = fs.readFileSync(ordersPath, "utf-8");
  const cartValidateContent = fs.readFileSync(cartValidatePath, "utf-8");
  const adminProductContent = fs.readFileSync(adminProductPath, "utf-8");
  const notificationsContent = fs.readFileSync(notificationsPath, "utf-8");
  const publicCouponsContent = fs.readFileSync(publicCouponsPath, "utf-8");
  const adminCouponsContent = fs.readFileSync(adminCouponsPath, "utf-8");

  // 1. JWT Security & Algorithm Confusion Hardening
  describe("1. JWT Security & Cryptographic Algorithm Enforcement", () => {
    it("enforces explicit HS256 algorithm on jwt.verify to prevent algorithm confusion attacks", () => {
      assert.ok(
        authContent.includes('algorithms: ["HS256"]'),
        "jwt.verify must enforce algorithms: ['HS256']"
      );
    });

    it("enforces explicit HS256 algorithm on jwt.sign", () => {
      assert.ok(
        authContent.includes('algorithm: "HS256"'),
        "jwt.sign must specify algorithm: 'HS256'"
      );
    });

    it("verifies header.alg is strictly HS256 in Edge runtime middleware", () => {
      assert.ok(
        middlewareContent.includes('headerObj.alg !== "HS256"'),
        "Edge JWT verification must validate header algorithm is HS256"
      );
    });
  });

  // 2. Privilege Escalation Prevention in Registration
  describe("2. Public Registration Privilege Escalation Prevention", () => {
    it("strictly defaults public registration role to CUSTOMER", () => {
      assert.ok(
        registerContent.includes('let role: "ADMIN" | "CUSTOMER" = "CUSTOMER"'),
        "Registration role must default to CUSTOMER"
      );
    });

    it("does not contain hardcoded admin phone numbers in registration fallback", () => {
      assert.ok(
        !registerContent.includes('"7022461700,9844797374"'),
        "Registration must not have hardcoded admin phone numbers fallback"
      );
    });
  });

  // 3. Order Placement & Cart Validation Security
  describe("3. Order Acceptance Authorization & Store Status Enforcement", () => {
    it("authoritatively checks ORDER_ACCEPTANCE_ENABLED in /api/orders and rejects when disabled", () => {
      assert.ok(
        ordersContent.includes('ORDER_ACCEPTANCE_ENABLED') &&
        ordersContent.includes('isOrderAcceptanceDisabled'),
        "Orders route must check ORDER_ACCEPTANCE_ENABLED setting"
      );
      assert.ok(
        ordersContent.includes('Order acceptance is currently disabled'),
        "Orders route must return specific message when acceptance is disabled"
      );
    });

    it("authoritatively checks ORDER_ACCEPTANCE_ENABLED in /api/cart/validate and invalidates cart", () => {
      assert.ok(
        cartValidateContent.includes('ORDER_ACCEPTANCE_ENABLED') &&
        cartValidateContent.includes('isOrderAcceptanceDisabled'),
        "Cart validate must check ORDER_ACCEPTANCE_ENABLED setting"
      );
    });
  });

  // 4. Product Hard Deletion Safety & Foreign Key Integrity
  describe("4. Database Foreign Key Integrity on Product Deletion", () => {
    it("checks for associated historical OrderItem records before allowing hard delete", () => {
      assert.ok(
        adminProductContent.includes('prisma.orderItem.count({ where: { productId: id } })'),
        "Product delete route must count linked order items"
      );
      assert.ok(
        adminProductContent.includes('Cannot permanently delete product: it is associated with'),
        "Product delete route must reject hard deletion when orders exist"
      );
    });
  });

  // 5. Open Redirect and XSS Prevention in Notification Broadcasts
  describe("5. Notification Broadcast URL Sanitization", () => {
    it("enforces relative internal path validation and blocks javascript: or protocol-relative URLs", () => {
      assert.ok(
        notificationsContent.includes('trimmedUrl.startsWith("/")') &&
        notificationsContent.includes('!trimmedUrl.startsWith("//")') &&
        notificationsContent.includes('!trimmedUrl.toLowerCase().includes("javascript:")'),
        "Notification broadcast targetUrl must be validated against open redirect and XSS"
      );
    });
  });

  // 6. Public Coupon Filtering & Input Sanitization
  describe("6. Coupon Exposure & Input Sanitization", () => {
    it("filters out expired coupons from public /api/coupons endpoint", () => {
      assert.ok(
        publicCouponsContent.includes('expiresAt: { gt: new Date() }'),
        "Public coupons endpoint must filter out expired coupons"
      );
    });

    it("ensures coupon creation value cannot be negative", () => {
      assert.ok(
        adminCouponsContent.includes('Math.max(0, parseInt(value, 10) || 0)'),
        "Admin coupon creation must prevent negative discount values"
      );
    });
  });
});
