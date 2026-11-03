import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

describe("HOMEMART4U — Production Corrections, Product Catalogue & Promotional Cards Suite", () => {
  describe("1. Business Identity, SEO & Structured Data Corrections", () => {
    it("frontend/src/app/layout.tsx must identify as Fresh Chicken & Farm Eggs, not general groceries", () => {
      const layoutContent = fs.readFileSync(path.join(rootDir, "frontend/src/app/layout.tsx"), "utf8");
      assert.ok(layoutContent.includes("Fresh Chicken & Farm Eggs"), "Title must feature Fresh Chicken & Farm Eggs");
      assert.ok(!layoutContent.includes("Daily Groceries & Fresh Meat"), "Obsolete 'Daily Groceries' title must be removed");
      assert.ok(!layoutContent.includes("@type\": \"GroceryStore\""), "Schema.org type must not be GroceryStore");
      assert.ok(layoutContent.includes("@type\": \"LocalBusiness\""), "Schema.org type must be LocalBusiness");
      assert.ok(!layoutContent.includes("~20-minute delivery"), "Unverified ~20-minute promise must be removed from layout description");
      assert.ok(!layoutContent.includes("dynamic UPI QR payments"), "Customer online payment promise must be removed from layout description");
    });

    it("frontend/src/app/manifest.ts must feature Fresh Chicken & Farm Eggs without grocery references", () => {
      const manifestContent = fs.readFileSync(path.join(rootDir, "frontend/src/app/manifest.ts"), "utf8");
      assert.ok(manifestContent.includes("Fresh Chicken & Farm Eggs"), "Manifest name must feature Fresh Chicken & Farm Eggs");
      assert.ok(!manifestContent.includes("Daily Groceries"), "Obsolete 'Daily Groceries' must be removed from manifest");
      assert.ok(!manifestContent.includes("~20 minutes"), "Unverified delivery time must be removed from manifest");
    });

    it("frontend/src/components/layout/Footer.tsx must not contain unverified delivery time claims", () => {
      const footerContent = fs.readFileSync(path.join(rootDir, "frontend/src/components/layout/Footer.tsx"), "utf8");
      assert.ok(!footerContent.includes("approximately 20 minutes across town"), "Unverified 20-minute delivery promise removed from footer");
      assert.ok(footerContent.includes("First 3 km free delivery across Mulbagal"), "Accurate Mulbagal delivery message present");
    });

    it("frontend/src/components/home/LandingBlogView.tsx must remove unverified delivery promises", () => {
      const blogContent = fs.readFileSync(path.join(rootDir, "frontend/src/components/home/LandingBlogView.tsx"), "utf8");
      assert.ok(!blogContent.includes("Delivered in ~20 Minutes."), "Hero title must not promise ~20 minutes");
      assert.ok(!blogContent.includes("Express ~20-Minute Delivery"), "Feature card must not promise ~20 minutes");
      assert.ok(blogContent.includes("Delivered to Your Doorstep"), "Accurate doorstep delivery hero title present");
    });
  });

  describe("2. Product Pricing & Zero Price Guard Rails", () => {
    it("ProductCard must not display ₹0 or allow purchasing unconfigured products", () => {
      const cardContent = fs.readFileSync(path.join(rootDir, "frontend/src/components/catalog/ProductCard.tsx"), "utf8");
      assert.ok(cardContent.includes("Price on Request"), "Displays 'Price on Request' when price is unconfigured");
      assert.ok(cardContent.includes("hasValidPrice"), "Checks for valid non-zero price before enabling add to cart");
      assert.ok(cardContent.includes("Unavailable"), "Renders 'Unavailable' CTA for unpriced items");
    });

    it("ProductDetailClient must not display ₹0 or allow adding unconfigured products to cart", () => {
      const detailContent = fs.readFileSync(path.join(rootDir, "frontend/src/app/product/[slug]/ProductDetailClient.tsx"), "utf8");
      assert.ok(detailContent.includes("Price on Request"), "Displays 'Price on Request' when unit price is missing or zero");
      assert.ok(detailContent.includes("Unavailable"), "Disables Add to Cart button when variant price is missing");
    });
  });

  describe("3. Promotional Carousel & Admin Content Endpoints", () => {
    it("PromotionalCarousel must support touch swipe navigation and keyboard accessibility", () => {
      const carouselContent = fs.readFileSync(path.join(rootDir, "frontend/src/components/home/PromotionalCarousel.tsx"), "utf8");
      assert.ok(carouselContent.includes("onTouchStart"), "Contains onTouchStart handler");
      assert.ok(carouselContent.includes("onTouchMove"), "Contains onTouchMove handler");
      assert.ok(carouselContent.includes("onTouchEnd"), "Contains onTouchEnd handler");
      assert.ok(carouselContent.includes("onKeyDown"), "Contains onKeyDown handler for arrow keys");
      assert.ok(carouselContent.includes("tabIndex"), "Accessible keyboard navigation tabIndex present");
    });

    it("backend/src/app/api/admin/content/[id]/route.ts must export both PUT and PATCH methods", () => {
      const contentRoute = fs.readFileSync(path.join(rootDir, "backend/src/app/api/admin/content/[id]/route.ts"), "utf8");
      assert.ok(contentRoute.includes("export async function PUT"), "PUT method exported");
      assert.ok(contentRoute.includes("export const PATCH = PUT"), "PATCH method exported to prevent 405 Method Not Allowed");
    });

    it("frontend/src/app/admin/content/page.tsx must provide schedule date inputs and live preview", () => {
      const adminContentPage = fs.readFileSync(path.join(rootDir, "frontend/src/app/admin/content/page.tsx"), "utf8");
      assert.ok(adminContentPage.includes("startDate"), "Supports start date scheduling");
      assert.ok(adminContentPage.includes("endDate"), "Supports expiry date");
      assert.ok(adminContentPage.includes("Live Homepage Carousel Preview:"), "Contains live preview component");
    });
  });

  describe("4. Database Catalogue Bootstrap Integrity", () => {
    it("backend/prisma/bootstrap-catalogue.cjs must define all 7 required chicken products", () => {
      const bootstrapContent = fs.readFileSync(path.join(rootDir, "backend/prisma/bootstrap-catalogue.cjs"), "utf8");
      const requiredSlugs = [
        "small-broiler-chicken",
        "big-broiler-chicken",
        "natti-chicken",
        "chicken-liver",
        "chicken-leg-piece",
        "chicken-lollipop",
        "chicken-wings",
      ];
      for (const slug of requiredSlugs) {
        assert.ok(bootstrapContent.includes(`"${slug}"`), `Bootstrap must include ${slug}`);
      }
    });

    it("backend/prisma/bootstrap-catalogue.cjs must define both required egg products", () => {
      const bootstrapContent = fs.readFileSync(path.join(rootDir, "backend/prisma/bootstrap-catalogue.cjs"), "utf8");
      assert.ok(bootstrapContent.includes('"desi-eggs"'), "Must include desi-eggs");
      assert.ok(bootstrapContent.includes('"farm-eggs"'), "Must include farm-eggs");
    });

    it("backend/prisma/bootstrap-catalogue.cjs must maintain Mutton and Fish as Coming Soon", () => {
      const bootstrapContent = fs.readFileSync(path.join(rootDir, "backend/prisma/bootstrap-catalogue.cjs"), "utf8");
      assert.ok(bootstrapContent.includes('"fresh-mutton"'), "Must include fresh-mutton category");
      assert.ok(bootstrapContent.includes('"fish-seafood"'), "Must include fish-seafood category");
      assert.ok(bootstrapContent.includes('isComingSoon: true'), "Must mark coming soon categories as isComingSoon: true");
    });

    it("backend/prisma/bootstrap-catalogue.cjs must define the 5 published promotional cards", () => {
      const bootstrapContent = fs.readFileSync(path.join(rootDir, "backend/prisma/bootstrap-catalogue.cjs"), "utf8");
      assert.ok(bootstrapContent.includes('"Fresh Chicken"'), "Must include Fresh Chicken card");
      assert.ok(bootstrapContent.includes('"Desi Eggs"'), "Must include Desi Eggs card");
      assert.ok(bootstrapContent.includes('"Farm Eggs"'), "Must include Farm Eggs card");
      assert.ok(bootstrapContent.includes('"Chicken Specials"'), "Must include Chicken Specials card");
      assert.ok(bootstrapContent.includes('"More Choices Coming Soon"'), "Must include Coming Soon card");
    });
  });
});
