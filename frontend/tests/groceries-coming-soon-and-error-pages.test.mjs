import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Groceries, Coming Soon Meat & Comprehensive Error Pages (Frontend)", () => {
  test("ProductCard must display Coming Soon badge and disabled CTA for fish, mutton, or coming soon items", () => {
    const productCardPath = path.join(rootDir, "src/components/catalog/ProductCard.tsx");
    const content = fs.readFileSync(productCardPath, "utf-8");

    assert.ok(content.includes("isComingSoon"), "ProductCard must compute isComingSoon");
    assert.ok(content.includes("Coming Soon"), "ProductCard must display 'Coming Soon' text");
    assert.ok(content.includes("fish-seafood") || content.includes("fresh-mutton"), "ProductCard must handle fish and mutton categories");
  });

  test("ProductDetailClient must display Coming Soon banner and disabled CTA for coming soon items", () => {
    const detailPath = path.join(rootDir, "src/app/product/[slug]/ProductDetailClient.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");

    assert.ok(content.includes("isComingSoon"), "ProductDetailClient must compute isComingSoon");
    assert.ok(content.includes("Coming Soon "), "ProductDetailClient must display Coming Soon banner");
    assert.ok(content.includes("Launching Shortly"), "ProductDetailClient CTA must announce launching shortly");
  });

  test("Comprehensive custom error pages must exist and provide store support hotline", () => {
    const errorPages = [
      "src/app/not-found.tsx",
      "src/app/error.tsx",
      "src/app/global-error.tsx",
      "src/app/forbidden.tsx",
      "src/app/403/page.tsx",
      "src/app/unauthorized.tsx",
      "src/app/401/page.tsx",
      "src/app/maintenance/page.tsx",
      "src/app/offline/page.tsx",
    ];

    for (const relPath of errorPages) {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Error page file ${relPath} must exist`);
      const content = fs.readFileSync(fullPath, "utf-8");
      // Pages with direct UI content (excluding simple re-exports) should contain support phone
      if (!content.includes("export { default")) {
        assert.ok(
          content.includes("90355 26638") || content.includes("9035526638"),
          `${relPath} must include customer support hotline 90355 26638`
        );
      }
    }
  });
});
