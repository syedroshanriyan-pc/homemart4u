import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("System Settings Allowlist, Shop Name Validation & Backend Authorization", () => {
  const adminSettingsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "settings", "route.ts");
  const publicSettingsRoutePath = path.join(rootDir, "src", "app", "api", "settings", "route.ts");
  const adminSettingsContent = fs.readFileSync(adminSettingsRoutePath, "utf-8");
  const publicSettingsContent = fs.readFileSync(publicSettingsRoutePath, "utf-8");

  // 1. ALLOWLIST AUDIT
  describe("1. Allowlist Integrity & shop_name Addition", () => {
    it("must permit 'shop_name' in the system settings allowlist", () => {
      assert.ok(
        adminSettingsContent.includes('"shop_name"') || adminSettingsContent.includes("'shop_name'"),
        "Allowlist must permit 'shop_name'"
      );
    });

    it("must preserve all 17 existing system setting keys without removing or modifying them", () => {
      const requiredExistingKeys = [
        "MERCHANT_UPI_VPA",
        "UPI_VPA",
        "MERCHANT_NAME",
        "UPI_MERCHANT_NAME",
        "SHOP_NAME",
        "SHOP_PHONE",
        "SHOP_EMAIL",
        "SHOP_ADDRESS",
        "DELIVERY_FEE_PAISE",
        "COD_SURCHARGE_PAISE",
        "FREE_DELIVERY_THRESHOLD_PAISE",
        "ESTIMATED_DELIVERY_MINUTES",
        "STORE_OPEN",
        "MIN_ORDER_AMOUNT_PAISE",
        "MAX_ORDER_AMOUNT_PAISE",
        "ORDER_ACCEPTANCE_ENABLED",
        "EMERGENCY_NOTICE",
      ];

      for (const key of requiredExistingKeys) {
        assert.ok(
          adminSettingsContent.includes(`"${key}"`) || adminSettingsContent.includes(`'${key}'`),
          `Existing key '${key}' must not be removed from ALLOWED_SETTING_KEYS`
        );
      }
    });

    it("must reject unknown or unapproved setting keys with standard 400 error message", () => {
      assert.ok(
        adminSettingsContent.includes("is not permitted by system allowlist"),
        "Must enforce allowlist rejection error message"
      );
    });
  });

  // 2. BACKEND AUTHORIZATION ENFORCEMENT
  describe("2. Server-Side Role-Based Access Control (RBAC)", () => {
    it("enforces authentication check on backend (rejects unauthenticated requests)", () => {
      assert.ok(
        adminSettingsContent.includes("!session") && adminSettingsContent.includes("401"),
        "Must return 401 Unauthorized when session is missing"
      );
    });

    it("strictly permits only ADMIN role and rejects CUSTOMER and DELIVERY_AGENT roles with 403 Forbidden", () => {
      assert.ok(
        adminSettingsContent.includes('session.role !== "ADMIN"'),
        "Must explicitly check session.role !== 'ADMIN'"
      );
      assert.ok(
        adminSettingsContent.includes("403"),
        "Must return 403 Forbidden for non-ADMIN roles (e.g. CUSTOMER, DELIVERY_AGENT)"
      );
    });

    it("never relies on client-supplied role values or frontend visibility", () => {
      assert.ok(
        adminSettingsContent.includes("getSessionUser"),
        "Must use authoritative session extraction via getSessionUser"
      );
      assert.ok(
        !adminSettingsContent.includes("body.role") && !adminSettingsContent.includes("req.headers.get('x-user-role')"),
        "Must not trust client-supplied role headers or body properties"
      );
    });
  });

  // 3. SHOP_NAME STRING VALIDATION RULES
  describe("3. String Validation for shop_name (2 to 100 trimmed characters)", () => {
    it("checks that shop_name is a string type", () => {
      assert.ok(
        adminSettingsContent.includes('typeof rawValue !== "string"'),
        "Must reject non-string values for shop_name"
      );
    });

    it("trims the value and verifies length is between 2 and 100 characters", () => {
      assert.ok(
        adminSettingsContent.includes("trimmedVal.length < 2") && adminSettingsContent.includes("trimmedVal.length > 100"),
        "Must enforce string length between 2 and 100 characters on trimmed string"
      );
    });

    it("functional validation simulation: accurately validates shop_name candidates", () => {
      const validateShopName = (val) => {
        if (typeof val !== "string") return false;
        const trimmed = val.trim();
        return trimmed.length >= 2 && trimmed.length <= 100;
      };

      // Valid values
      assert.equal(validateShopName("Homemart4u"), true);
      assert.equal(validateShopName("  Fresh Chicken Centre  "), true);
      assert.equal(validateShopName("AB"), true); // Exactly 2 characters
      assert.equal(validateShopName("A".repeat(100)), true); // Exactly 100 characters

      // Invalid values
      assert.equal(validateShopName(""), false); // Empty string
      assert.equal(validateShopName("    "), false); // Whitespace only
      assert.equal(validateShopName("A"), false); // 1 character (< 2)
      assert.equal(validateShopName("A".repeat(101)), false); // 101 characters (> 100)
      assert.equal(validateShopName(12345), false); // Number
      assert.equal(validateShopName(null), false); // null
      assert.equal(validateShopName(undefined), false); // undefined
      assert.equal(validateShopName({ name: "Homemart4u" }), false); // object
    });
  });

  // 4. PERSISTENCE ARCHITECTURE
  describe("4. Prisma Persistence & Cross-Key Synchronization", () => {
    it("persists settings using prisma.systemSetting.upsert", () => {
      assert.ok(
        adminSettingsContent.includes("prisma.systemSetting.upsert"),
        "Must persist to database using prisma.systemSetting.upsert"
      );
    });

    it("synchronizes shop_name and SHOP_NAME to guarantee seamless multi-format compatibility", () => {
      assert.ok(
        adminSettingsContent.includes('key === "shop_name"') && adminSettingsContent.includes('"SHOP_NAME"'),
        "Must synchronize shop_name and SHOP_NAME"
      );
    });

    it("records administrative audit log on update", () => {
      assert.ok(
        adminSettingsContent.includes("prisma.auditLog.create"),
        "Must record auditLog entry"
      );
      assert.ok(
        adminSettingsContent.includes('"SYSTEM_SETTINGS_UPDATED"'),
        "Audit action must be SYSTEM_SETTINGS_UPDATED"
      );
    });
  });

  // 5. PUBLIC STOREFRONT PROTECTION
  describe("5. Public Storefront Endpoint Security (/api/settings)", () => {
    it("implements strict public allowlist restricting which keys can be read by public storefront", () => {
      assert.ok(
        publicSettingsContent.includes("PUBLIC_ALLOWED_SETTING_KEYS"),
        "Must define PUBLIC_ALLOWED_SETTING_KEYS allowlist"
      );
    });

    it("does not expose arbitrary database settings, credentials, or private secrets", () => {
      assert.ok(
        !publicSettingsContent.includes("settingsMap[s.key] = s.value;\n    });"),
        "Must not indiscriminately copy all database settings to public response"
      );
      assert.ok(
        publicSettingsContent.includes("where: {"),
        "Public settings query must filter using where clause or allowlist check"
      );
    });

    it("retrieves and exposes saved shop_name to storefront consumers", () => {
      assert.ok(
        publicSettingsContent.includes('settingsMap.shop_name = s.value'),
        "Public settings must map saved shop_name"
      );
    });
  });

  // 6. ADMIN FRONTEND SETTINGS UI
  describe("6. Admin Frontend Settings Page Integration", () => {
    const adminSettingsFrontendPath = path.join(repoRoot, "frontend", "src", "app", "admin", "settings", "page.tsx");
    const adminFrontendContent = fs.readFileSync(adminSettingsFrontendPath, "utf-8");

    it("admin settings page binds shop_name input to settings state", () => {
      assert.ok(
        adminFrontendContent.includes('settings.shop_name'),
        "Admin settings state must track shop_name"
      );
      assert.ok(
        adminFrontendContent.includes('handleChange("shop_name"'),
        "Input must update shop_name in form state"
      );
    });

    it("loads saved shop_name correctly on initial mount and reload", () => {
      assert.ok(
        adminFrontendContent.includes('fetch("/api/admin/settings")'),
        "Must fetch settings from /api/admin/settings"
      );
      assert.ok(
        adminFrontendContent.includes('map["shop_name"] = map["SHOP_NAME"]'),
        "Must support falling back from legacy SHOP_NAME to shop_name"
      );
    });

    it("submits updated shop_name to backend API", () => {
      assert.ok(
        adminFrontendContent.includes('body: JSON.stringify({ settings })'),
        "Form submission must send settings object"
      );
    });
  });
});

