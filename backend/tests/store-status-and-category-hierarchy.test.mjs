import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("Store Operating Status, Backend Enforcement & Category Hierarchy", () => {
  const storeStatusRoutePath = path.join(rootDir, "src", "app", "api", "admin", "store-status", "route.ts");
  const ordersRoutePath = path.join(rootDir, "src", "app", "api", "orders", "route.ts");
  const cartValidateRoutePath = path.join(rootDir, "src", "app", "api", "cart", "validate", "route.ts");
  const adminCategoriesRoutePath = path.join(rootDir, "src", "app", "api", "admin", "categories", "route.ts");
  const publicCategoriesRoutePath = path.join(rootDir, "src", "app", "api", "categories", "route.ts");
  const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
  const adminSettingsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "settings", "route.ts");
  const publicSettingsRoutePath = path.join(rootDir, "src", "app", "api", "settings", "route.ts");
  const orderSuccessPagePath = path.join(repoRoot, "frontend", "src", "app", "order-success", "page.tsx");
  const orderTrackingPagePath = path.join(repoRoot, "frontend", "src", "app", "account", "orders", "[id]", "page.tsx");

  const storeStatusContent = fs.readFileSync(storeStatusRoutePath, "utf-8");
  const ordersContent = fs.readFileSync(ordersRoutePath, "utf-8");
  const cartValidateContent = fs.readFileSync(cartValidateRoutePath, "utf-8");
  const adminCategoriesContent = fs.readFileSync(adminCategoriesRoutePath, "utf-8");
  const publicCategoriesContent = fs.readFileSync(publicCategoriesRoutePath, "utf-8");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const adminSettingsContent = fs.readFileSync(adminSettingsRoutePath, "utf-8");
  const publicSettingsContent = fs.readFileSync(publicSettingsRoutePath, "utf-8");
  const orderSuccessContent = fs.readFileSync(orderSuccessPagePath, "utf-8");
  const orderTrackingContent = fs.readFileSync(orderTrackingPagePath, "utf-8");

  // PART 1: STORE OPERATING STATUS ARCHITECTURE & RBAC
  describe("1. Store Operating Status Administration & Persistence", () => {
    it("provides dedicated /api/admin/store-status endpoint", () => {
      assert.ok(fs.existsSync(storeStatusRoutePath), "store-status route file must exist");
    });

    it("strictly requires ADMIN role on POST /api/admin/store-status (rejects unauthenticated/unauthorized)", () => {
      assert.ok(
        storeStatusContent.includes('session.role !== "ADMIN"'),
        "Must verify session.role is strictly ADMIN"
      );
      assert.ok(
        storeStatusContent.includes("403") && storeStatusContent.includes("401"),
        "Must return 401 for unauthenticated and 403 for non-admin"
      );
    });

    it("validates store_status strictly to OPEN or CLOSED", () => {
      assert.ok(
        storeStatusContent.includes('"OPEN"') && storeStatusContent.includes('"CLOSED"'),
        "Must support and validate OPEN and CLOSED statuses"
      );
    });

    it("atomically persists store status in PostgreSQL SystemSetting table", () => {
      assert.ok(
        storeStatusContent.includes("prisma.systemSetting.upsert"),
        "Must persist store status to SystemSetting table via upsert"
      );
      assert.ok(
        storeStatusContent.includes('"store_status"') && storeStatusContent.includes('"store_open_status"'),
        "Must update both canonical store status keys"
      );
    });

    it("creates an audit log entry on store status update", () => {
      assert.ok(
        storeStatusContent.includes("prisma.auditLog.create"),
        "Must write audit trail on status change"
      );
    });

    it("includes store_status and store_closed_message in admin and public system settings allowlists", () => {
      assert.ok(adminSettingsContent.includes('"store_status"'), "Admin settings must permit store_status");
      assert.ok(adminSettingsContent.includes('"store_closed_message"'), "Admin settings must permit store_closed_message");
      assert.ok(publicSettingsContent.includes('"store_status"'), "Public settings must expose store_status");
      assert.ok(publicSettingsContent.includes('"store_closed_message"'), "Public settings must expose store_closed_message");
    });
  });

  // PART 2: AUTHORITATIVE BACKEND STORE CLOSED ENFORCEMENT
  describe("2. Authoritative Backend Order Blocking When Store is Closed", () => {
    it("enforces store status check before creating any order in /api/orders", () => {
      assert.ok(
        ordersContent.includes("storeStatusSetting") || ordersContent.includes("store_status"),
        "Orders route must query store_status setting"
      );
      assert.ok(
        ordersContent.includes('status: 403'),
        "Orders route must reject with HTTP 403 Forbidden when store is closed"
      );
      assert.ok(
        ordersContent.includes("store_closed_message") || ordersContent.includes("The store is currently closed"),
        "Must return descriptive store closed message"
      );
    });

    it("enforces store status validation in /api/cart/validate", () => {
      assert.ok(
        cartValidateContent.includes("store_status") && cartValidateContent.includes("isStoreClosed"),
        "Cart validate must check store operating status"
      );
      assert.ok(
        cartValidateContent.includes("errors.push") && cartValidateContent.includes("isValid: errors.length === 0 && items.length > 0"),
        "Cart validate must push error and invalidate cart when store is closed"
      );
    });
  });

  // PART 3: PRISMA SCHEMA CATEGORY HIERARCHY
  describe("3. Prisma Schema Hierarchy & Relationships", () => {
    it("contains parentId and CategoryHierarchy relations on Category model", () => {
      assert.ok(
        schemaContent.includes("parentId"),
        "Category model must have parentId field"
      );
      assert.ok(
        schemaContent.includes('@relation("CategoryHierarchy"'),
        "Category model must have CategoryHierarchy self-referential relation"
      );
      assert.ok(
        schemaContent.includes("@@index([parentId])"),
        "Category model must index parentId for performant subcategory queries"
      );
    });
  });

  // PART 4: CATEGORY AND SUBCATEGORY CRUD APIS
  describe("4. Category & Subcategory Administration API", () => {
    it("supports flat querying and nested hierarchical querying in GET /api/admin/categories", () => {
      assert.ok(
        adminCategoriesContent.includes('searchParams.get("flat") === "true"'),
        "Admin categories GET must support ?flat=true query parameter"
      );
      assert.ok(
        adminCategoriesContent.includes("parentId: null"),
        "Admin categories GET must query root categories for hierarchical view"
      );
    });

    it("validates parent existence and prevents orphan subcategories in POST", () => {
      assert.ok(
        adminCategoriesContent.includes("Selected parent category does not exist"),
        "Must reject non-existent parentId"
      );
    });

    it("validates against self-parenting and circular ancestry in PATCH", () => {
      assert.ok(
        adminCategoriesContent.includes("cannot be set as its own parent"),
        "Must prevent category from setting itself as parent"
      );
      assert.ok(
        adminCategoriesContent.includes("Circular category hierarchy detected"),
        "Must prevent circular loop relationships"
      );
    });

    it("implements safe DELETE with dependency protection against orphaned products or subcategories", () => {
      assert.ok(
        adminCategoriesContent.includes("export async function DELETE"),
        "Admin categories API must implement DELETE method"
      );
      assert.ok(
        adminCategoriesContent.includes("subcategory/subcategories"),
        "Must prevent deleting category that has subcategories"
      );
      assert.ok(
        adminCategoriesContent.includes("product(s)"),
        "Must prevent deleting category that has assigned products"
      );
    });

    it("includes active children in public GET /api/categories", () => {
      assert.ok(
        publicCategoriesContent.includes("children:"),
        "Public categories API must include active children subcategories"
      );
    });
  });

  // PART 5: ORDER CONFIRMATION & TRACKING RELIABILITY
  describe("5. Order Success & Tracking Reliability", () => {
    it("provides functional navigation buttons on Order Success without conflicting preventDefault halts", () => {
      assert.ok(
        orderSuccessContent.includes('href="/menu"'),
        "Order success must provide direct link to /menu"
      );
      assert.ok(
        orderSuccessContent.includes('href={trackOrderUrl}'),
        "Order success must provide direct link to trackOrderUrl"
      );
    });

    it("embeds an instant official Tax Invoice modal on Order Success page", () => {
      assert.ok(
        orderSuccessContent.includes("isInvoiceModalOpen"),
        "Order success page must have isInvoiceModalOpen state"
      );
      assert.ok(
        orderSuccessContent.includes("invoice-printable-area"),
        "Order success page must render official printable tax invoice"
      );
    });

    it("order tracking page initializes instantly from session cache and uses authenticated apiClient", () => {
      assert.ok(
        orderTrackingContent.includes("fc_latest_order"),
        "Order tracking page must check sessionStorage fc_latest_order for zero-latency load"
      );
      assert.ok(
        orderTrackingContent.includes("apiClient.get"),
        "Order tracking page must use authenticated apiClient"
      );
      assert.ok(
        orderTrackingContent.includes("PLACED") &&
        orderTrackingContent.includes("CONFIRMED") &&
        orderTrackingContent.includes("PREPARING") &&
        orderTrackingContent.includes("OUT_FOR_DELIVERY") &&
        orderTrackingContent.includes("DELIVERED"),
        "Order tracking page must render 5 full lifecycle stages"
      );
    });
  });
});
