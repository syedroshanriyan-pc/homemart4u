import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("Frontend Payment UI, COD Policy & Animations", () => {
  it("checkout page must enforce Cash on Delivery only and remove customer online payment options", () => {
    const checkoutPagePath = path.join(rootDir, "src", "app", "checkout", "page.tsx");
    assert.ok(fs.existsSync(checkoutPagePath), "Checkout page must exist");
    const content = fs.readFileSync(checkoutPagePath, "utf-8");
    assert.ok(content.includes("Cash on Delivery"), "Checkout page must display Cash on Delivery");
    assert.ok(content.includes('paymentMethod: "COD"'), "Checkout page must submit COD paymentMethod");
    assert.ok(!content.includes("<DynamicPaymentModal"), "DynamicPaymentModal must not be rendered on customer checkout");
  });

  it("globals.css must define fintech checkmark, crossmark, and reduced-motion animations", () => {
    const cssPath = path.join(rootDir, "src", "app", "globals.css");
    assert.ok(fs.existsSync(cssPath), "globals.css must exist");
    const content = fs.readFileSync(cssPath, "utf-8");
    assert.ok(content.includes("animate-checkmark-circle"), "Must define checkmark circle animation");
    assert.ok(content.includes("animate-checkmark-check"), "Must define checkmark draw animation");
    assert.ok(content.includes("animate-crossmark-circle"), "Must define crossmark animation");
    assert.ok(content.includes("prefers-reduced-motion"), "Must support prefers-reduced-motion accessibility");
  });
});
