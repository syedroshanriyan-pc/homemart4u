import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("Suite 21 — Admin Control, Dynamic Configuration & Mobile-First Responsive Design", () => {
  const adminSettingsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "settings", "route.ts");
  const publicSettingsRoutePath = path.join(rootDir, "src", "app", "api", "settings", "route.ts");
  const dashboardRoutePath = path.join(rootDir, "src", "app", "api", "admin", "dashboard", "route.ts");

  const adminSettingsContent = fs.readFileSync(adminSettingsRoutePath, "utf-8");
  const publicSettingsContent = fs.readFileSync(publicSettingsRoutePath, "utf-8");
  const dashboardRouteContent = fs.readFileSync(dashboardRoutePath, "utf-8");

  const adminSettingsPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "settings", "page.tsx");
  const adminOverviewPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "page.tsx");
  const adminOrdersPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "orders", "page.tsx");
  const adminProductsPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "products", "page.tsx");

  const adminSettingsPageContent = fs.readFileSync(adminSettingsPagePath, "utf-8");
  const adminOverviewPageContent = fs.readFileSync(adminOverviewPagePath, "utf-8");
  const adminOrdersPageContent = fs.readFileSync(adminOrdersPagePath, "utf-8");
  const adminProductsPageContent = fs.readFileSync(adminProductsPagePath, "utf-8");

  // =========================================================================
  // 1. SYSTEM SETTINGS ALLOWLIST & PERMITTED CONFIGURATION KEYS
  // =========================================================================
  describe("1. System Settings Allowlist & Key Permissibility", () => {
    it("must permit all required business information settings", () => {
      const businessKeys = [
        "shop_name",
        "shop_phone",
        "support_phone",
        "shop_email",
        "shop_address",
        "store_opening_hours",
        "store_closing_hours",
        "shop_logo_url",
        "shop_latitude",
        "shop_longitude",
      ];
      for (const key of businessKeys) {
        assert.ok(
          adminSettingsContent.includes(`"${key}"`) || adminSettingsContent.includes(`'${key}'`),
          `Key '${key}' must be present in ALLOWED_SETTING_KEYS`
        );
      }
    });

    it("must permit all store operation and availability settings", () => {
      const opKeys = [
        "store_status",
        "store_open_status",
        "store_closed_message",
        "store_reopening_info",
        "order_acceptance_enabled",
      ];
      for (const key of opKeys) {
        assert.ok(
          adminSettingsContent.includes(`"${key}"`) || adminSettingsContent.includes(`'${key}'`),
          `Key '${key}' must be present in ALLOWED_SETTING_KEYS`
        );
      }
    });

    it("must permit all delivery configuration settings", () => {
      const deliveryKeys = [
        "delivery_available",
        "delivery_radius_km",
        "free_delivery_radius_meters",
        "base_delivery_fee_paise",
        "free_delivery_threshold_paise",
        "delivery_rate_per_100m_paise",
        "min_order_amount_paise",
        "minimum_order_meat_grams",
      ];
      for (const key of deliveryKeys) {
        assert.ok(
          adminSettingsContent.includes(`"${key}"`) || adminSettingsContent.includes(`'${key}'`),
          `Key '${key}' must be present in ALLOWED_SETTING_KEYS`
        );
      }
    });

    it("must permit all checkout policy and payment settings", () => {
      const checkoutKeys = [
        "cod_available",
        "cod_surcharge_paise",
        "order_instructions",
        "UPI_VPA",
        "UPI_MERCHANT_NAME",
      ];
      for (const key of checkoutKeys) {
        assert.ok(
          adminSettingsContent.includes(`"${key}"`) || adminSettingsContent.includes(`'${key}'`),
          `Key '${key}' must be present in ALLOWED_SETTING_KEYS`
        );
      }
    });

    it("must reject unknown setting keys with standard 400 error message", () => {
      assert.ok(
        adminSettingsContent.includes("is not permitted by system allowlist"),
        "Must enforce allowlist rejection error message"
      );
    });

    it("must enforce shop_name length validation between 2 and 100 characters", () => {
      assert.ok(
        adminSettingsContent.includes("trimmedVal.length < 2 || trimmedVal.length > 100"),
        "Must enforce shop_name string length bounds (2 to 100 chars)"
      );
    });

    it("must automatically synchronize operational aliases (shop_name, order_acceptance_enabled, store_status)", () => {
      assert.ok(
        adminSettingsContent.includes('key === "shop_name"'),
        "Must synchronize shop_name with SHOP_NAME"
      );
      assert.ok(
        adminSettingsContent.includes('key === "order_acceptance_enabled"'),
        "Must synchronize order_acceptance_enabled with ORDER_ACCEPTANCE_ENABLED"
      );
      assert.ok(
        adminSettingsContent.includes('key === "store_status"'),
        "Must synchronize store_status with STORE_OPEN"
      );
    });
  });

  // =========================================================================
  // 2. BACKEND AUTHORIZATION & SAFE PUBLIC EXPOSURE
  // =========================================================================
  describe("2. Backend Authorization & Safe Public Exposure", () => {
    it("must verify session user and enforce exact ADMIN role for setting changes", () => {
      assert.ok(
        adminSettingsContent.includes('session.role !== "ADMIN"'),
        "Must enforce session.role === 'ADMIN'"
      );
      assert.ok(
        adminSettingsContent.includes("Forbidden: Admin access required"),
        "Must return 403 Forbidden for non-admin roles"
      );
    });

    it("must record audit logs for setting modifications", () => {
      assert.ok(
        adminSettingsContent.includes("prisma.auditLog.create"),
        "Must persist audit log on settings change"
      );
    });

    it("must safely expose public settings while protecting internal secrets", () => {
      assert.ok(
        publicSettingsContent.includes("PUBLIC_ALLOWED_SETTING_KEYS") || publicSettingsContent.includes("PUBLIC_SETTING_KEYS"),
        "Must maintain strict PUBLIC_ALLOWED_SETTING_KEYS allowlist on public settings route"
      );
      assert.ok(
        publicSettingsContent.includes("shop_name"),
        "Public settings must include shop_name"
      );
      assert.ok(
        !publicSettingsContent.includes("DATABASE_URL") && !publicSettingsContent.includes("JWT_SECRET"),
        "Public settings must never expose credentials or internal configuration"
      );
    });
  });

  // =========================================================================
  // 3. DASHBOARD METRICS FROM REAL POSTGRESQL COUNTS
  // =========================================================================
  describe("3. Dashboard Metrics Endpoints (Real PostgreSQL Counts)", () => {
    it("must query real product, category, promo card and order counts from PostgreSQL", () => {
      assert.ok(dashboardRouteContent.includes("prisma.product.count()"), "Must count total products");
      assert.ok(dashboardRouteContent.includes("prisma.category.count()"), "Must count total categories");
      assert.ok(dashboardRouteContent.includes("prisma.offerContent.count"), "Must count active promotional cards");
      assert.ok(dashboardRouteContent.includes("totalProducts: totalProductsCount"), "Must pass totalProducts count in response");
      assert.ok(dashboardRouteContent.includes("availableProducts: availableProductsCount"), "Must pass availableProducts in response");
      assert.ok(dashboardRouteContent.includes("unavailableProducts: unavailableProductsCount"), "Must pass unavailableProducts in response");
      assert.ok(dashboardRouteContent.includes("totalCategories: totalCategoriesCount"), "Must pass totalCategories in response");
      assert.ok(dashboardRouteContent.includes("activePromotionalCards: activePromotionalCardsCount"), "Must pass activePromotionalCards in response");
      assert.ok(dashboardRouteContent.includes("store_status"), "Must include store_status in response");
    });
  });

  // =========================================================================
  // 4. ADMIN DASHBOARD OVERVIEW UI (8 METRICS GRID)
  // =========================================================================
  describe("4. Admin Dashboard Overview UI", () => {
    it("must render the 8-card responsive overview grid with grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", () => {
      assert.ok(
        adminOverviewPageContent.includes("grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"),
        "Overview grid must use responsive breakpoints: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      );
      assert.ok(adminOverviewPageContent.includes("Total Products"), "Must render Total Products card");
      assert.ok(adminOverviewPageContent.includes("Available (In Stock)"), "Must render Available Products card");
      assert.ok(adminOverviewPageContent.includes("Unavailable Items"), "Must render Unavailable Items card");
      assert.ok(adminOverviewPageContent.includes("Total Categories"), "Must render Total Categories card");
      assert.ok(adminOverviewPageContent.includes("Promo Cards"), "Must render Promo Cards card");
      assert.ok(adminOverviewPageContent.includes("Store Status"), "Must render Store Status card");
      assert.ok(adminOverviewPageContent.includes("Pending Orders"), "Must render Pending Orders card");
      assert.ok(adminOverviewPageContent.includes("Delivered Orders"), "Must render Delivered Orders card");
    });
  });

  // =========================================================================
  // 5. ADMIN SETTINGS UI (4 DISTINCT SECTIONS & TOUCH TARGETS)
  // =========================================================================
  describe("5. Admin Settings UI (4 Distinct Sections & Touch Targets)", () => {
    it("must structure configuration into 4 distinct, navigable sections", () => {
      assert.ok(
        adminSettingsPageContent.includes("1. Business & Contact Information") ||
        adminSettingsPageContent.includes("1. Business &amp; Contact Information"),
        "Must render Section 1: Business Information"
      );
      assert.ok(
        adminSettingsPageContent.includes("2. Store Operating Status") ||
        adminSettingsPageContent.includes("2. Store Operating Status &amp; Availability"),
        "Must render Section 2: Store Operating Status"
      );
      assert.ok(
        adminSettingsPageContent.includes("3. Delivery Parameters") ||
        adminSettingsPageContent.includes("3. Delivery Parameters &amp; Fee Logic"),
        "Must render Section 3: Delivery Parameters"
      );
      assert.ok(
        adminSettingsPageContent.includes("4. Checkout Policy") ||
        adminSettingsPageContent.includes("4. Checkout Policy &amp; Doorstep Payment Settings"),
        "Must render Section 4: Checkout Policy"
      );
    });

    it("must implement minimum 44px touch targets on interactive controls for mobile", () => {
      const min44Count = (adminSettingsPageContent.match(/min-h-\[44px\]/g) || []).length;
      assert.ok(
        min44Count >= 15,
        `Admin Settings page must provide at least 15 min-h-[44px] touch targets (found ${min44Count})`
      );
    });
  });

  // =========================================================================
  // 6. ADMIN ORDERS LIST UI (MOBILE CARDS + DESKTOP TABLE)
  // =========================================================================
  describe("6. Admin Orders List UI (Mobile-First Card View & Desktop Table)", () => {
    it("must provide mobile-first card view on small screens and desktop table on large screens", () => {
      assert.ok(
        adminOrdersPageContent.includes("block md:hidden"),
        "Must provide stacked card view on mobile screens (< 768px)"
      );
      assert.ok(
        adminOrdersPageContent.includes("hidden md:block"),
        "Must display table layout on desktop screens (>= 768px)"
      );
    });

    it("must provide touch-friendly min 44px buttons for filters, search and actions", () => {
      const min44Count = (adminOrdersPageContent.match(/min-h-\[44px\]/g) || []).length;
      assert.ok(
        min44Count >= 5,
        `Admin Orders page must enforce min-h-[44px] touch targets on interactive elements (found ${min44Count})`
      );
    });
  });

  // =========================================================================
  // 7. ADMIN PRODUCTS CATALOGUE UI (MOBILE CARDS + DESKTOP TABLE)
  // =========================================================================
  describe("7. Admin Products Catalogue UI (Mobile-First Card View & Desktop Table)", () => {
    it("must provide mobile-first card view on small screens and desktop table on large screens", () => {
      assert.ok(
        adminProductsPageContent.includes("block md:hidden"),
        "Must provide stacked card view on mobile screens (< 768px)"
      );
      assert.ok(
        adminProductsPageContent.includes("hidden md:block"),
        "Must display table layout on desktop screens (>= 768px)"
      );
    });

    it("must provide touch-friendly min 44px action buttons for stock toggle and management", () => {
      const min44Count = (adminProductsPageContent.match(/min-h-\[44px\]/g) || []).length;
      assert.ok(
        min44Count >= 5,
        `Admin Products page must enforce min-h-[44px] touch targets on mobile controls (found ${min44Count})`
      );
    });
  });
});
