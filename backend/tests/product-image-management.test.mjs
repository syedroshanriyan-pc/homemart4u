import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("Suite 23: Database-Backed Product Image Management & Google Images Suite", () => {
  const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
  const uploadApiPath = path.join(rootDir, "src", "app", "api", "admin", "upload", "route.ts");
  const serveUploadPath = path.join(rootDir, "src", "app", "api", "uploads", "[id]", "route.ts");
  const adminProductPath = path.join(rootDir, "src", "app", "api", "admin", "products", "route.ts");
  const adminProductIdPath = path.join(rootDir, "src", "app", "api", "admin", "products", "[id]", "route.ts");
  const adminProductsPagePath = path.join(repoRoot, "frontend", "src", "app", "admin", "products", "page.tsx");
  const productImagePath = path.join(repoRoot, "frontend", "src", "components", "ui", "ProductImage.tsx");
  const checkoutPagePath = path.join(repoRoot, "frontend", "src", "app", "checkout", "page.tsx");
  const orderSuccessPath = path.join(repoRoot, "frontend", "src", "app", "order-success", "page.tsx");
  const accountOrderIdPath = path.join(repoRoot, "frontend", "src", "app", "account", "orders", "[id]", "page.tsx");
  const adminOrderIdPath = path.join(repoRoot, "frontend", "src", "app", "admin", "orders", "[id]", "page.tsx");

  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const uploadApiContent = fs.readFileSync(uploadApiPath, "utf-8");
  const serveUploadContent = fs.readFileSync(serveUploadPath, "utf-8");
  const adminProductContent = fs.readFileSync(adminProductPath, "utf-8");
  const adminProductIdContent = fs.readFileSync(adminProductIdPath, "utf-8");
  const adminProductsPageContent = fs.readFileSync(adminProductsPagePath, "utf-8");
  const productImageContent = fs.readFileSync(productImagePath, "utf-8");
  const checkoutPageContent = fs.readFileSync(checkoutPagePath, "utf-8");
  const orderSuccessContent = fs.readFileSync(orderSuccessPath, "utf-8");
  const accountOrderIdContent = fs.readFileSync(accountOrderIdPath, "utf-8");
  const adminOrderIdContent = fs.readFileSync(adminOrderIdPath, "utf-8");

  // =========================================================================
  // 1. DATABASE SCHEMA & PERSISTENT STORAGE MODEL
  // =========================================================================
  describe("1. Database Schema & Persistent Storage Architecture", () => {
    it("Product model must have an imageUrl string field for persistence", () => {
      assert.ok(
        schemaContent.includes("imageUrl       String?"),
        "Product model must define imageUrl String? in Prisma schema"
      );
    });

    it("UploadedMedia model must be defined in schema for database-backed file storage", () => {
      assert.ok(
        schemaContent.includes("model UploadedMedia"),
        "Prisma schema must define UploadedMedia model"
      );
      assert.ok(
        schemaContent.includes("dataBase64"),
        "UploadedMedia must persist file data in database"
      );
      assert.ok(
        schemaContent.includes("mimeType"),
        "UploadedMedia must store mimeType for HTTP streaming"
      );
    });
  });

  // =========================================================================
  // 2. BACKEND UPLOAD API & SECURITY CONTROLS
  // =========================================================================
  describe("2. Backend Upload API & Authorization", () => {
    it("upload endpoint must strictly enforce ADMIN session role", () => {
      assert.ok(
        uploadApiContent.includes('session.role !== "ADMIN"'),
        "Upload route must verify session.role === 'ADMIN' and reject others"
      );
      assert.ok(
        uploadApiContent.includes("403"),
        "Must return 403 Forbidden for unauthorized requests"
      );
    });

    it("upload endpoint must validate allowed image mime types", () => {
      assert.ok(
        uploadApiContent.includes("image/jpeg") &&
        uploadApiContent.includes("image/png") &&
        uploadApiContent.includes("image/webp"),
        "Upload route must validate image MIME types"
      );
    });

    it("upload endpoint must enforce a 5MB maximum file size limit", () => {
      assert.ok(
        uploadApiContent.includes("5 * 1024 * 1024") || uploadApiContent.includes("MAX_FILE_SIZE_BYTES"),
        "Upload route must enforce 5MB maximum size limit"
      );
    });

    it("upload endpoint must record audit logs upon successful upload", () => {
      assert.ok(
        uploadApiContent.includes("prisma.auditLog.create"),
        "Upload route must record an audit log entry"
      );
    });

    it("public media route must serve binary data with permanent caching headers", () => {
      assert.ok(
        serveUploadContent.includes('headers:'),
        "Media endpoint must set response headers"
      );
      assert.ok(
        serveUploadContent.includes("max-age=31536000, immutable"),
        "Media endpoint must set immutable public Cache-Control"
      );
      assert.ok(
        serveUploadContent.includes("Buffer.from(media.dataBase64"),
        "Media endpoint must decode binary buffer for streaming"
      );
    });
  });

  // =========================================================================
  // 3. PRODUCT MUTATIONS & ADMIN OVERRIDE CONTROL
  // =========================================================================
  describe("3. Product Mutations & Admin Control", () => {
    it("POST /api/admin/products must store admin imageUrl or null without forcing Unsplash fallback", () => {
      assert.ok(
        adminProductContent.includes("imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null") ||
        !adminProductContent.includes('imageUrl || "https://images.unsplash.com'),
        "Product creation must respect admin imageUrl without forcing fallback stock photo"
      );
    });

    it("PATCH /api/admin/products/[id] must set imageUrl to null when cleared by admin", () => {
      assert.ok(
        adminProductIdContent.includes("imageUrl: body.imageUrl !== undefined ? (body.imageUrl && String(body.imageUrl).trim() ? String(body.imageUrl).trim() : null) : undefined"),
        "Product update must allow setting imageUrl to null when admin clears or removes image"
      );
    });
  });

  // =========================================================================
  // 4. ADMIN DASHBOARD IMAGE MANAGEMENT UI
  // =========================================================================
  describe("4. Admin Dashboard Image Management UI", () => {
    it("Admin Products page must provide file upload input and upload button", () => {
      assert.ok(
        adminProductsPageContent.includes('type="file"') &&
        adminProductsPageContent.includes("handleFileUpload"),
        "Admin Products page must include file input and handleFileUpload function"
      );
      assert.ok(
        adminProductsPageContent.includes("Upload from Device") ||
        adminProductsPageContent.includes("Replace from Device"),
        "Must offer clear button to upload/replace image from device"
      );
    });

    it("Admin Products page must clean Google Images redirect URLs", () => {
      assert.ok(
        adminProductsPageContent.includes("google.") &&
        adminProductsPageContent.includes("imgurl"),
        "Must extract direct image URL from Google imgres redirects"
      );
    });

    it("Admin Products page must reject temporary browser blob: URLs", () => {
      assert.ok(
        adminProductsPageContent.includes('trimmed.startsWith("blob:")') ||
        adminProductsPageContent.includes('blob:'),
        "Must reject temporary browser blob URLs and guide admin to upload"
      );
    });

    it("Admin Products page must display live verification probe for external image URLs", () => {
      assert.ok(
        adminProductsPageContent.includes("imageVerifyState") &&
        adminProductsPageContent.includes("imageVerifyMsg"),
        "Must provide live verification probe for external image URLs"
      );
    });

    it("Admin Products page must provide remove image button that clears the state", () => {
      assert.ok(
        adminProductsPageContent.includes("Remove Image") ||
        adminProductsPageContent.includes("Clear Image"),
        "Must provide button to remove or clear product image"
      );
    });
  });

  // =========================================================================
  // 5. CUSTOMER WEBSITE & CHECKOUT CONSISTENCY
  // =========================================================================
  describe("5. Customer Website & End-to-End Image Consistency", () => {
    it("ProductImage component must support /api/uploads/ and unoptimized flag", () => {
      assert.ok(
        productImageContent.includes("/api/uploads/"),
        "ProductImage must support internal /api/uploads/ persistent paths"
      );
      assert.ok(
        productImageContent.includes("unoptimized"),
        "ProductImage must support unoptimized rendering"
      );
    });

    it("Checkout page must display ProductImage for each item in the itemized list", () => {
      assert.ok(
        checkoutPageContent.includes("<ProductImage") &&
        checkoutPageContent.includes("src={i.imageUrl}"),
        "Checkout page itemized list must display ProductImage with item.imageUrl"
      );
    });

    it("Order success page must display ProductImage for confirmed order items", () => {
      assert.ok(
        orderSuccessContent.includes("<ProductImage") &&
        orderSuccessContent.includes("item.product?.imageUrl"),
        "Order success page must display ProductImage with item.product.imageUrl"
      );
    });

    it("Customer Order Tracking page must display ProductImage for order items", () => {
      assert.ok(
        accountOrderIdContent.includes("<ProductImage") &&
        accountOrderIdContent.includes("item.product?.imageUrl"),
        "Customer order tracking page must display ProductImage with item.product.imageUrl"
      );
    });

    it("Admin Order Detail page must display ProductImage for order items", () => {
      assert.ok(
        adminOrderIdContent.includes("<ProductImage") &&
        adminOrderIdContent.includes("item.product?.imageUrl"),
        "Admin order detail page must display ProductImage with item.product.imageUrl"
      );
    });
  });
});
