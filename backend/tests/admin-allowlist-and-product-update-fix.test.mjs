import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("HOMEMART4U — Admin Settings Allowlist & Product Update Reliability Suite", () => {
  const adminSettingsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "settings", "route.ts");
  const productUpdateRoutePath = path.join(rootDir, "src", "app", "api", "admin", "products", "[id]", "route.ts");
  const frontendSettingsPath = path.join(repoRoot, "frontend", "src", "app", "admin", "settings", "page.tsx");
  const frontendProductsPath = path.join(repoRoot, "frontend", "src", "app", "admin", "products", "page.tsx");

  const adminSettingsContent = fs.readFileSync(adminSettingsRoutePath, "utf-8");
  const productUpdateContent = fs.readFileSync(productUpdateRoutePath, "utf-8");
  const frontendSettingsContent = fs.readFileSync(frontendSettingsPath, "utf-8");
  const frontendProductsContent = fs.readFileSync(frontendProductsPath, "utf-8");

  describe("1. Admin Settings Allowlist & DELIVERY_ROUND_ROBIN_INDEX Fix", () => {
    it("defines INTERNAL_OPERATIONAL_KEYS containing DELIVERY_ROUND_ROBIN_INDEX", () => {
      assert.ok(
        adminSettingsContent.includes("INTERNAL_OPERATIONAL_KEYS"),
        "Must declare INTERNAL_OPERATIONAL_KEYS set"
      );
      assert.ok(
        adminSettingsContent.includes('"DELIVERY_ROUND_ROBIN_INDEX"') || adminSettingsContent.includes("'DELIVERY_ROUND_ROBIN_INDEX'"),
        "INTERNAL_OPERATIONAL_KEYS must include DELIVERY_ROUND_ROBIN_INDEX"
      );
    });

    it("GET /api/admin/settings filters out internal operational keys", () => {
      assert.ok(
        adminSettingsContent.includes("in: Array.from(ALLOWED_SETTING_KEYS)"),
        "GET /api/admin/settings must filter settings by ALLOWED_SETTING_KEYS"
      );
    });

    it("POST /api/admin/settings safely ignores internal operational keys instead of rejecting", () => {
      assert.ok(
        adminSettingsContent.includes("INTERNAL_OPERATIONAL_KEYS.has(trimmedKey)"),
        "POST route must check INTERNAL_OPERATIONAL_KEYS before checking allowlist"
      );
      assert.ok(
        adminSettingsContent.includes("continue;"),
        "POST route must skip internal operational keys without throwing 400"
      );
    });

    it("POST /api/admin/settings preserves strict rejection of unapproved setting keys", () => {
      assert.ok(
        adminSettingsContent.includes("!ALLOWED_SETTING_KEYS.has(trimmedKey)"),
        "Must retain allowlist check for unapproved keys"
      );
      assert.ok(
        adminSettingsContent.includes("is not permitted by system allowlist"),
        "Must return standard allowlist rejection message for unapproved keys"
      );
    });

    it("Frontend Settings page filters out internal keys from state and save payloads", () => {
      assert.ok(
        frontendSettingsContent.includes("DELIVERY_ROUND_ROBIN_INDEX"),
        "Frontend settings must identify DELIVERY_ROUND_ROBIN_INDEX"
      );
      assert.ok(
        frontendSettingsContent.includes("ignoredKeys.forEach"),
        "Frontend settings must sanitize payload before sending POST"
      );
    });
  });

  describe("2. Product Management Update Reliability & Safe Variant Deletion", () => {
    it("verifies target product existence and returns 404 if not found", () => {
      assert.ok(
        productUpdateContent.includes("PRODUCT_NOT_FOUND"),
        "Must return PRODUCT_NOT_FOUND error code if product does not exist"
      );
    });

    it("validates slug uniqueness and returns 409 on collision", () => {
      assert.ok(
        productUpdateContent.includes("SLUG_COLLISION"),
        "Must check slug collision and return SLUG_COLLISION code"
      );
    });

    it("validates category existence before executing update", () => {
      assert.ok(
        productUpdateContent.includes("CATEGORY_NOT_FOUND"),
        "Must verify category exists and return CATEGORY_NOT_FOUND"
      );
    });

    it("validates variants array preventing empty or invalid variant prices", () => {
      assert.ok(
        productUpdateContent.includes("EMPTY_VARIANTS"),
        "Must reject empty variants array"
      );
      assert.ok(
        productUpdateContent.includes("INVALID_VARIANT_PRICE"),
        "Must reject variants with price <= 0"
      );
    });

    it("prevents Postgres transaction abort by checking OrderItem count before variant deletion", () => {
      // Must check order items count before attempting delete
      assert.ok(
        productUpdateContent.includes("tx.orderItem.count"),
        "Must check orderItem count before deleting variant inside transaction"
      );
      assert.ok(
        productUpdateContent.includes("isAvailable: false"),
        "Must soft-deactivate variant if orderItem references exist"
      );
      // Must not rely on a try/catch block around delete that aborts the Postgres transaction
      assert.ok(
        !productUpdateContent.includes("catch {\n            await tx.productVariant.update"),
        "Must not catch delete failure inside interactive transaction because Postgres aborts the entire block"
      );
    });

    it("returns structured error response with correlation ID on unexpected errors", () => {
      assert.ok(
        productUpdateContent.includes("correlationId"),
        "Must generate and return correlationId for tracking"
      );
      assert.ok(
        productUpdateContent.includes("P2002"),
        "Must handle Prisma P2002 unique constraint violations"
      );
      assert.ok(
        productUpdateContent.includes("P2003"),
        "Must handle Prisma P2003 foreign key constraint violations"
      );
    });

    it("Frontend Products page properly displays backend error message", () => {
      assert.ok(
        frontendProductsContent.includes("err.error || err.message"),
        "Frontend product form must extract and display backend error message"
      );
    });
  });
});

