import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("External Product Image URLs & Professional Presentation Suite", () => {
  const nextConfigPath = path.join(rootDir, "next.config.mjs");
  const productImagePath = path.join(rootDir, "src", "components", "ui", "ProductImage.tsx");
  const productCardPath = path.join(rootDir, "src", "components", "catalog", "ProductCard.tsx");
  const productDetailPath = path.join(rootDir, "src", "app", "product", "[slug]", "ProductDetailClient.tsx");
  const adminProductsPath = path.join(rootDir, "src", "app", "admin", "products", "page.tsx");

  const nextConfigContent = fs.readFileSync(nextConfigPath, "utf-8");
  const productImageContent = fs.readFileSync(productImagePath, "utf-8");
  const productCardContent = fs.readFileSync(productCardPath, "utf-8");
  const productDetailContent = fs.readFileSync(productDetailPath, "utf-8");
  const adminProductsContent = fs.readFileSync(adminProductsPath, "utf-8");

  // =========================================================================
  // 1. NEXT.JS CONFIGURATION & CSP FOR EXTERNAL HOSTNAMES
  // =========================================================================
  describe("1. Next.js Remote Patterns & CSP Allowance", () => {
    it("must permit wildcard external image hosts in remotePatterns (**)", () => {
      assert.ok(
        nextConfigContent.includes('hostname: "**"'),
        "next.config.mjs must configure hostname: '**' to allow arbitrary external image URLs"
      );
      assert.ok(
        nextConfigContent.includes('protocol: "https"') && nextConfigContent.includes('protocol: "http"'),
        "Must support both HTTPS and HTTP external image protocols"
      );
    });

    it("must permit external image origins in Content-Security-Policy (img-src https: http:)", () => {
      assert.ok(
        nextConfigContent.includes("img-src 'self' data: blob: https: http:;"),
        "CSP in next.config.mjs must permit https: and http: image origins"
      );
    });
  });

  // =========================================================================
  // 2. PRODUCT IMAGE COMPONENT ARCHITECTURE & RESILIENCE
  // =========================================================================
  describe("2. ProductImage Component Architecture & Professional Resilience", () => {
    it("must export ProductImage component", () => {
      assert.ok(
        productImageContent.includes("export const ProductImage"),
        "Must export ProductImage component"
      );
    });

    it("must provide an elegant shimmering skeleton loading state", () => {
      assert.ok(
        productImageContent.includes("animate-pulse") && productImageContent.includes("isLoading"),
        "Must render animated shimmer skeleton while loading"
      );
    });

    it("must gracefully catch onError and render a branded professional fallback", () => {
      assert.ok(
        productImageContent.includes("onError={() => {") || productImageContent.includes("setHasError(true)"),
        "Must implement onError handler to prevent broken image displays"
      );
      assert.ok(
        productImageContent.includes("renderFallback"),
        "Must render branded fallback when image URL fails to load"
      );
    });

    it("must style fallbacks appropriately for meat, eggs, and groceries", () => {
      assert.ok(productImageContent.includes("isEgg"), "Must differentiate egg products");
      assert.ok(productImageContent.includes("isMeat"), "Must differentiate fresh meat/chicken cuts");
      assert.ok(
        productImageContent.includes("100% Halal Fresh") || productImageContent.includes("Farm & Desi"),
        "Fallback must display professional quality trust badge"
      );
    });

    it("must sanitize and normalize raw external image URLs", () => {
      assert.ok(
        productImageContent.includes("startsWith(\"http://\")") &&
        productImageContent.includes("startsWith(\"https://\")"),
        "Must normalize incoming image URLs"
      );
    });
  });

  // =========================================================================
  // 3. STOREFRONT COMPONENT INTEGRATION
  // =========================================================================
  describe("3. Storefront Component Integration", () => {
    it("ProductCard must use ProductImage for resilient external image rendering", () => {
      assert.ok(
        productCardContent.includes("<ProductImage"),
        "ProductCard must render images using ProductImage component"
      );
    });

    it("ProductDetailClient must use ProductImage for high-res external hero imagery", () => {
      assert.ok(
        productDetailContent.includes("<ProductImage"),
        "ProductDetailClient must render images using ProductImage component"
      );
    });
  });

  // =========================================================================
  // 4. ADMIN DASHBOARD EXTERNAL IMAGE PREVIEW & HIGH-RES PRESETS
  // =========================================================================
  describe("4. Admin Dashboard External Image Controls & Curated Photography", () => {
    it("Admin Products page must use ProductImage in mobile and desktop catalog listings", () => {
      const matchCount = (adminProductsContent.match(/<ProductImage/g) || []).length;
      assert.ok(
        matchCount >= 2,
        `Admin Products page must use ProductImage across views (found ${matchCount})`
      );
    });

    it("Admin Product modal must provide live external image preview with fallback", () => {
      assert.ok(
        adminProductsContent.includes("Product Image (External URL or Preset)") ||
        adminProductsContent.includes("Product Image"),
        "Modal must provide dedicated product image section"
      );
      assert.ok(
        adminProductsContent.includes("Clear Image"),
        "Modal must provide button to clear or reset the image URL"
      );
    });

    it("Admin Product modal must offer comprehensive curated photography presets for all cuts", () => {
      assert.ok(
        adminProductsContent.includes("🍗 Small Broiler Cut"),
        "Must offer Small Broiler Cut preset"
      );
      assert.ok(
        adminProductsContent.includes("🐓 Natti / Country Chicken"),
        "Must offer Natti / Country Chicken preset"
      );
      assert.ok(
        adminProductsContent.includes("🫀 Fresh Chicken Liver"),
        "Must offer Chicken Liver preset"
      );
      assert.ok(
        adminProductsContent.includes("🍢 Chicken Lollipop"),
        "Must offer Chicken Lollipop preset"
      );
      assert.ok(
        adminProductsContent.includes("🥚 Country Desi Nati Eggs"),
        "Must offer Desi Nati Eggs preset"
      );
      assert.ok(
        adminProductsContent.includes("🥚 Farm Fresh White Eggs"),
        "Must offer Farm Fresh White Eggs preset"
      );
    });
  });
});
