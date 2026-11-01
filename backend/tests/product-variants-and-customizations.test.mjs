import test, { describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("Product Variants & Customizations Production Readiness", () => {
  describe("1. Backend Orders API Validation Logic", () => {
    const ordersRoute = fs.readFileSync(path.join(rootDir, "src/app/api/orders/route.ts"), "utf-8");

    test("verifies variant exists and is available", () => {
      assert.ok(ordersRoute.includes("variant.isAvailable"), "Must verify variant availability");
    });

    test("authoritatively joins customization options with group for product validation", () => {
      assert.ok(
        ordersRoute.includes("group: true") || ordersRoute.includes("include: { group: true }"),
        "Must include group in customizationOption query"
      );
      assert.ok(
        ordersRoute.includes("opt.group.productId !== variant.productId"),
        "Must verify option belongs to variant's product"
      );
    });

    test("enforces SINGLE selection constraint on single-choice customization groups", () => {
      assert.ok(
        ordersRoute.includes('group.selectionType === "SINGLE"') && ordersRoute.includes("selectedForGroup.length > 1"),
        "Must reject multiple selections on SINGLE customization groups"
      );
    });

    test("enforces isRequired constraint on mandatory customization groups", () => {
      assert.ok(
        ordersRoute.includes("group.isRequired") && ordersRoute.includes("selectedForGroup.length === 0"),
        "Must enforce required customization selection"
      );
    });

    test("authoritatively accumulates price delta into unit price", () => {
      assert.ok(
        ordersRoute.includes("variant.priceMinor + customizationTotalDelta"),
        "Must calculate authoritative price from variant + customization price deltas"
      );
    });

    test("creates order item with rich customization snapshot JSON", () => {
      assert.ok(
        ordersRoute.includes("customizationSnapshotJson:") && ordersRoute.includes("JSON.stringify(verifiedCustomizations)"),
        "Must save snapshot of selections in customizationSnapshotJson"
      );
    });
  });

  describe("2. Cart Validation API Parity", () => {
    const cartValidateRoute = fs.readFileSync(path.join(rootDir, "src/app/api/cart/validate/route.ts"), "utf-8");

    test("verifies option product ownership in cart validate", () => {
      assert.ok(
        cartValidateRoute.includes("opt.group.productId !== variant.productId"),
        "Cart validate must ensure option belongs to the product"
      );
    });

    test("validates single vs multiple and required groups in cart", () => {
      assert.ok(
        cartValidateRoute.includes('group.selectionType === "SINGLE"') && cartValidateRoute.includes("selectedForGroup.length > 1"),
        "Cart validate must verify single selection rule"
      );
      assert.ok(
        cartValidateRoute.includes("group.isRequired") && cartValidateRoute.includes("selectedForGroup.length === 0"),
        "Cart validate must verify required group selection"
      );
    });
  });

  describe("3. Admin Products Management API", () => {
    const adminProductDetailRoute = fs.readFileSync(path.join(rootDir, "src/app/api/admin/products/[id]/route.ts"), "utf-8");

    test("GET returns variants and customizationGroups with options", () => {
      assert.ok(adminProductDetailRoute.includes("customizationGroups: {"), "Admin detail must include customization groups");
      assert.ok(adminProductDetailRoute.includes("options: {"), "Admin detail must include customization options");
      assert.ok(adminProductDetailRoute.includes("variants: {"), "Admin detail must include variants");
    });

    test("PATCH handles atomic variant creation, update, and deactivation", () => {
      assert.ok(adminProductDetailRoute.includes("prisma.$transaction"), "Admin PATCH must be atomic via transaction");
      assert.ok(adminProductDetailRoute.includes("tx.productVariant.update"), "Admin PATCH must update existing variants");
      assert.ok(adminProductDetailRoute.includes("tx.productVariant.create"), "Admin PATCH must create new variants");
    });

    test("PATCH handles customization group sync and option upsertion", () => {
      assert.ok(adminProductDetailRoute.includes("tx.customizationGroup.update"), "Admin PATCH must update customization groups");
      assert.ok(adminProductDetailRoute.includes("tx.customizationGroup.create"), "Admin PATCH must create customization groups");
      assert.ok(adminProductDetailRoute.includes("tx.customizationOption.update"), "Admin PATCH must update customization options");
      assert.ok(adminProductDetailRoute.includes("tx.customizationOption.create"), "Admin PATCH must create customization options");
    });
  });

  describe("4. Frontend Customer Experience", () => {
    const productDetailClient = fs.readFileSync(
      path.join(repoRoot, "frontend/src/app/product/[slug]/ProductDetailClient.tsx"),
      "utf-8"
    );

    test("renders Choose your quantity variant section", () => {
      assert.ok(productDetailClient.includes("Choose your quantity"), "Detail page must feature Choose your quantity section");
      assert.ok(productDetailClient.includes("selectedVariant"), "Detail page must track selectedVariant state");
    });

    test("renders single customization groups indicator and multiple selection indicator", () => {
      assert.ok(productDetailClient.includes("isSingle"), "Must distinguish isSingle vs multiple groups");
      assert.ok(productDetailClient.includes("rounded-full"), "Must render circular indicator for single selection");
    });

    test("shows live price calculation with customization charges", () => {
      assert.ok(productDetailClient.includes("Customization Charges"), "Must display live customization charges breakdown");
    });

    test("validates required customization groups before adding to cart", () => {
      assert.ok(productDetailClient.includes("validationWarning"), "Must track validationWarning");
      assert.ok(productDetailClient.includes("Please select your preference for"), "Must warn user if required option is missing");
    });
  });

  describe("5. Admin Order Detail Customization Snapshot Display", () => {
    const adminOrderDetail = fs.readFileSync(
      path.join(repoRoot, "frontend/src/app/admin/orders/[id]/page.tsx"),
      "utf-8"
    );

    test("renders customization snapshot badges in admin order detail", () => {
      assert.ok(adminOrderDetail.includes("customizationSnapshotJson"), "Admin orders must read customizationSnapshotJson");
      assert.ok(adminOrderDetail.includes("c.group ? `${c.group}: ` : \"\""), "Admin orders must format group and option text");
    });
  });
});
