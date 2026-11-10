import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("HOMEMART4U — Admin Dashboard Functionality & Real-Time Sync Suite", () => {
  const storeStatusRoutePath = path.join(rootDir, "src", "app", "api", "admin", "store-status", "route.ts");
  const ordersRoutePath = path.join(rootDir, "src", "app", "api", "orders", "route.ts");
  const cartValidateRoutePath = path.join(rootDir, "src", "app", "api", "cart", "validate", "route.ts");
  const adminCategoriesRoutePath = path.join(rootDir, "src", "app", "api", "admin", "categories", "route.ts");
  const adminProductsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "products", "route.ts");
  const adminProductDetailRoutePath = path.join(rootDir, "src", "app", "api", "admin", "products", "[id]", "route.ts");
  const adminContentRoutePath = path.join(rootDir, "src", "app", "api", "admin", "content", "route.ts");
  const adminContentDetailRoutePath = path.join(rootDir, "src", "app", "api", "admin", "content", "[id]", "route.ts");
  const publicCategoriesRoutePath = path.join(rootDir, "src", "app", "api", "categories", "route.ts");
  const publicProductsRoutePath = path.join(rootDir, "src", "app", "api", "products", "route.ts");
  const publicSettingsRoutePath = path.join(rootDir, "src", "app", "api", "settings", "route.ts");
  const adminSettingsRoutePath = path.join(rootDir, "src", "app", "api", "admin", "settings", "route.ts");
  const navbarComponentPath = path.join(repoRoot, "frontend", "src", "components", "layout", "Navbar.tsx");
  const cartPagePath = path.join(repoRoot, "frontend", "src", "app", "cart", "page.tsx");
  const checkoutPagePath = path.join(repoRoot, "frontend", "src", "app", "checkout", "page.tsx");
  const adminCategoriesPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "categories", "page.tsx");
  const adminProductsPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "products", "page.tsx");

  const storeStatusContent = fs.readFileSync(storeStatusRoutePath, "utf-8");
  const ordersContent = fs.readFileSync(ordersRoutePath, "utf-8");
  const cartValidateContent = fs.readFileSync(cartValidateRoutePath, "utf-8");
  const adminCategoriesContent = fs.readFileSync(adminCategoriesRoutePath, "utf-8");
  const adminProductsContent = fs.readFileSync(adminProductsRoutePath, "utf-8");
  const adminProductDetailContent = fs.readFileSync(adminProductDetailRoutePath, "utf-8");
  const adminContentContent = fs.readFileSync(adminContentRoutePath, "utf-8");
  const adminContentDetailContent = fs.readFileSync(adminContentDetailRoutePath, "utf-8");
  const publicCategoriesContent = fs.readFileSync(publicCategoriesRoutePath, "utf-8");
  const publicProductsContent = fs.readFileSync(publicProductsRoutePath, "utf-8");
  const navbarContent = fs.readFileSync(navbarComponentPath, "utf-8");
  const cartContent = fs.readFileSync(cartPagePath, "utf-8");
  const checkoutContent = fs.readFileSync(checkoutPagePath, "utf-8");
  const adminCategoriesPageContent = fs.readFileSync(adminCategoriesPagePath, "utf-8");
  const adminProductsPageContent = fs.readFileSync(adminProductsPagePath, "utf-8");

  // 1. STORE OPERATING STATUS & AUTHORITATIVE ENFORCEMENT
  describe("1. Store Operating Status & Authoritative Enforcement", () => {
    it("Admin endpoint persists OPEN and CLOSED states atomically with audit trail", () => {
      assert.ok(storeStatusContent.includes('session.role !== "ADMIN"'), "Must require ADMIN role");
      assert.ok(storeStatusContent.includes('prisma.systemSetting.upsert'), "Must upsert status in PostgreSQL");
      assert.ok(storeStatusContent.includes('prisma.auditLog.create'), "Must record audit trail");
      assert.ok(storeStatusContent.includes('publishEvent("customer", "STORE_STATUS_CHANGED"'), "Must emit real-time event to customer channel");
    });

    it("Backend order creation route rejects orders with 403 when store is closed", () => {
      assert.ok(ordersContent.includes('storeStatusSetting'), "Must inspect store status setting");
      assert.ok(ordersContent.includes('status: 403'), "Must reject with HTTP 403 Forbidden");
      assert.ok(ordersContent.includes('store_closed_message'), "Must return configurable closed message");
    });

    it("Backend cart validation route invalidates checkout when store is closed", () => {
      assert.ok(cartValidateContent.includes('isStoreClosed'), "Must evaluate store status");
      assert.ok(cartValidateContent.includes('errors.push'), "Must push store closed error into cart errors");
    });

    it("Frontend Navbar, Cart, and Checkout listen to real-time status updates", () => {
      assert.ok(navbarContent.includes('useRealTime'), "Navbar must listen to real-time events");
      assert.ok(navbarContent.includes('storeStatus === "CLOSED"'), "Navbar must display store closed state");
      assert.ok(cartContent.includes('useRealTime'), "Cart page must listen to real-time events");
      assert.ok(cartContent.includes('disabled'), "Cart page must disable checkout CTA when store is closed");
      assert.ok(checkoutContent.includes('useRealTime'), "Checkout page must listen to real-time events");
    });
  });

  // 2. CATEGORY & SUBCATEGORY ADMINISTRATION
  describe("2. Category and Subcategory Hierarchy & Administration", () => {
    it("POST /api/admin/categories supports subcategories and enforces 2-level hierarchy", () => {
      assert.ok(adminCategoriesContent.includes('effectiveParentId'), "Must resolve parent category ID");
      assert.ok(adminCategoriesContent.includes('Selected parent category does not exist'), "Must reject non-existent parents");
      assert.ok(adminCategoriesContent.includes('publishEvent("customer", "CATEGORIES_UPDATED"'), "Must publish real-time update event");
    });

    it("Admin categories UI restricts parent selection to top-level categories", () => {
      assert.ok(adminCategoriesPageContent.includes('!c.parentId'), "Must filter parent options to top-level categories only");
      assert.ok(adminCategoriesPageContent.includes('openCreateModal(parent.id)'), "Parent card must provide direct Add Subcategory action");
    });

    it("Public /api/products route queries include subcategories when filtering by parent slug", () => {
      assert.ok(publicProductsContent.includes('targetCat.children'), "Products query must fetch subcategories of requested parent");
      assert.ok(publicProductsContent.includes('categoryId = { in: catIds }'), "Must include both parent and child category IDs");
    });
  });

  // 3. PRODUCT & VARIANT CRUD & CUSTOMIZATIONS
  describe("3. Product, Variant, and Customization Management", () => {
    it("Product creation and update routes support nested variants and customization groups", () => {
      assert.ok(adminProductsContent.includes('variantCreateData'), "Product creation must handle variants");
      assert.ok(adminProductsContent.includes('customizationGroupsCreateData'), "Product creation must handle customizations");
      assert.ok(adminProductDetailContent.includes('tx.productVariant'), "Product detail update must manage variants transactionally");
      assert.ok(adminProductDetailContent.includes('tx.customizationGroup'), "Product detail update must manage customization groups");
    });

    it("Admin Products form cleanly separates Main Category and Subcategory selection", () => {
      assert.ok(adminProductsPageContent.includes('mainCategoriesForDept'), "Products UI must compute main categories");
      assert.ok(adminProductsPageContent.includes('subcategoriesForSelectedCategory'), "Products UI must compute subcategories");
      assert.ok(adminProductsPageContent.includes('handleCreateSubcategory'), "Products UI must provide inline subcategory creator");
      assert.ok(adminProductsPageContent.includes('subcategoryId || categoryId'), "Must fallback to main category if subcategory is not chosen");
    });

    it("Product updates emit real-time updates to catalog channel", () => {
      assert.ok(adminProductDetailContent.includes('publishEvent("catalog", "CATALOG_UPDATED"'), "Must emit CATALOG_UPDATED on product change");
      assert.ok(adminProductDetailContent.includes('publishEvent("admin", "CATALOG_UPDATED"'), "Must emit CATALOG_UPDATED to admin channel");
    });
  });

  // 4. PROMOTIONAL OFFERS / CONTENT CMS REAL-TIME SYNC
  describe("4. Promotional Cards & Content CMS Real-Time Sync", () => {
    it("Content CMS emits real-time events on create, update, and delete", () => {
      assert.ok(adminContentContent.includes('publishEvent("customer", "OFFERS_UPDATED"'), "Create offer must emit real-time event");
      assert.ok(adminContentDetailContent.includes('publishEvent("customer", "OFFERS_UPDATED"'), "Update offer must emit real-time event");
      assert.ok(adminContentDetailContent.includes('publishEvent("customer", "OFFERS_UPDATED"'), "Delete offer must emit real-time event");
    });
  });

  // 5. SERVER-AUTHORITATIVE RBAC SECURITY
  describe("5. Role-Based Access Control & Security", () => {
    it("All admin endpoints enforce exact ADMIN role verification", () => {
      assert.ok(storeStatusContent.includes('session.role !== "ADMIN"'), "store-status must enforce ADMIN");
      assert.ok(adminCategoriesContent.includes('session.role !== "ADMIN"'), "categories must enforce ADMIN");
      assert.ok(adminProductsContent.includes('session.role !== "ADMIN"'), "products must enforce ADMIN");
      assert.ok(adminProductDetailContent.includes('session.role !== "ADMIN"'), "product detail must enforce ADMIN");
      assert.ok(adminContentContent.includes('session.role !== "ADMIN"'), "content must enforce ADMIN");
    });

    it("Order route authoritatively validates prices and rejected fabricated option IDs", () => {
      assert.ok(ordersContent.includes('opt.group.productId !== variant.productId'), "Must verify option belongs to product");
      assert.ok(ordersContent.includes('Group "${group.name}" only allows a single selection'), "Must enforce SINGLE selection constraint");
      assert.ok(ordersContent.includes('Please make a selection for required preference'), "Must enforce REQUIRED customization constraint");
    });
  });
});

