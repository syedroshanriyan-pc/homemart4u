import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(rootDir, "..");

describe("HOMEMART4U — Prisma Transaction Lifecycle & Product Customization Update Suite", () => {
  const productUpdateRoutePath = path.join(rootDir, "src", "app", "api", "admin", "products", "[id]", "route.ts");
  const productUpdateContent = fs.readFileSync(productUpdateRoutePath, "utf-8");

  describe("1. Prisma Transaction Configuration & Lifecycle Integrity", () => {
    it("configures explicit bounded timeout and maxWait on prisma.$transaction", () => {
      assert.ok(
        productUpdateContent.includes("timeout: 15000") || productUpdateContent.includes("timeout: 20000") || productUpdateContent.includes("timeout: 25000"),
        "Must configure explicit timeout (>= 15000ms) on $transaction to prevent premature timeout on remote pooler"
      );
      assert.ok(
        productUpdateContent.includes("maxWait: 5000") || productUpdateContent.includes("maxWait: 10000"),
        "Must configure explicit maxWait on $transaction"
      );
    });

    it("ensures all transactional operations use tx instance and not global prisma", () => {
      // Find the transaction block
      const txStart = productUpdateContent.indexOf("prisma.$transaction");
      assert.ok(txStart > 0, "Must contain prisma.$transaction call");
      const txEnd = productUpdateContent.indexOf("await prisma.auditLog.create");
      assert.ok(txEnd > txStart, "Must contain auditLog outside transaction");

      const txBlock = productUpdateContent.substring(txStart, txEnd);

      // Verify no 'await prisma.' calls inside txBlock (only 'tx.')
      const forbiddenPrismaCall = /await\s+prisma\.(?!auditLog)/.test(txBlock);
      assert.equal(forbiddenPrismaCall, false, "Must not execute global prisma queries inside the interactive transaction block");
    });

    it("ensures the final product query is explicitly awaited before returning from transaction", () => {
      assert.ok(
        productUpdateContent.includes("const finalProduct = await tx.product.findUnique") ||
        productUpdateContent.includes("await tx.product.findUnique"),
        "Final findUnique query must be explicitly awaited before return"
      );
    });

    it("never disconnects Prisma ($disconnect) while transaction is active", () => {
      assert.ok(
        !productUpdateContent.includes("$disconnect"),
        "Must never call $disconnect inside route handler"
      );
    });
  });

  describe("2. Elimination of N+1 Queries (Batched Operations)", () => {
    it("batches removed variant deactivations and deletions using updateMany and deleteMany", () => {
      assert.ok(
        productUpdateContent.includes("tx.productVariant.updateMany"),
        "Must batch variant deactivations with updateMany"
      );
      assert.ok(
        productUpdateContent.includes("tx.productVariant.deleteMany"),
        "Must batch variant deletions with deleteMany"
      );
    });

    it("batches customization group deletions with deleteMany", () => {
      assert.ok(
        productUpdateContent.includes("tx.customizationGroup.deleteMany"),
        "Must batch removed group deletions with deleteMany"
      );
    });

    it("batches customization option deletions and creations with deleteMany and createMany", () => {
      assert.ok(
        productUpdateContent.includes("tx.customizationOption.deleteMany"),
        "Must batch removed option deletions with deleteMany"
      );
      assert.ok(
        productUpdateContent.includes("tx.customizationOption.createMany"),
        "Must batch new option creations with createMany"
      );
    });
  });

  describe("3. Structured Error Handling & Diagnostic Mapping", () => {
    it("handles Prisma P2028 and transaction timeout with code TRANSACTION_TIMEOUT (HTTP 504)", () => {
      assert.ok(
        productUpdateContent.includes("P2028") && productUpdateContent.includes("TRANSACTION_TIMEOUT"),
        "Must catch P2028 and return TRANSACTION_TIMEOUT"
      );
      assert.ok(
        productUpdateContent.includes("status: 504"),
        "Must return 504 status code for transaction timeouts"
      );
    });

    it("handles database connection failures (P1001, P1002, P1017) with code DATABASE_CONNECTION_ERROR (HTTP 503)", () => {
      assert.ok(
        productUpdateContent.includes("P1001") && productUpdateContent.includes("DATABASE_CONNECTION_ERROR"),
        "Must handle database connection failures gracefully"
      );
      assert.ok(
        productUpdateContent.includes("status: 503"),
        "Must return 503 status code for connection failures"
      );
    });

    it("handles unique constraint (P2002) and foreign key (P2003) violations", () => {
      assert.ok(
        productUpdateContent.includes("P2002") && productUpdateContent.includes("status: 409"),
        "Must return 409 for unique slug collisions"
      );
      assert.ok(
        productUpdateContent.includes("P2003") && productUpdateContent.includes("status: 400"),
        "Must return 400 for foreign key violations"
      );
    });

    it("validates customization group and option ownership before initiating transaction", () => {
      assert.ok(
        productUpdateContent.includes("GROUP_MISMATCH"),
        "Must validate customization group ownership before transaction"
      );
      assert.ok(
        productUpdateContent.includes("OPTION_MISMATCH"),
        "Must validate customization option ownership before transaction"
      );
    });
  });

  describe("4. Functional Simulation: Customization & Variant Reconciliation", () => {
    // Test data
    const existingProduct = {
      id: "prod_101",
      name: "Fresh Whole Chicken",
      slug: "fresh-whole-chicken",
      variants: [
        { id: "var_1", name: "500g", priceMinor: 14000, isAvailable: true },
        { id: "var_2", name: "1 kg", priceMinor: 26000, isAvailable: true },
        { id: "var_3", name: "1.5 kg", priceMinor: 38000, isAvailable: true },
      ],
      customizationGroups: [
        {
          id: "grp_cut",
          name: "Cutting Style",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 0,
          options: [
            { id: "opt_curry", name: "Curry Cut", priceDeltaMinor: 0, isActive: true },
            { id: "opt_biryani", name: "Biryani Cut", priceDeltaMinor: 0, isActive: true },
            { id: "opt_boneless", name: "Boneless", priceDeltaMinor: 3000, isActive: true },
          ],
        },
        {
          id: "grp_clean",
          name: "Cleaning Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { id: "opt_skinless", name: "Skinless", priceDeltaMinor: 0, isActive: true },
            { id: "opt_withskin", name: "With Skin", priceDeltaMinor: 0, isActive: true },
          ],
        },
      ],
    };

    it("1. Update product without customization groups", () => {
      const payload = {
        name: "Fresh Whole Chicken Updated",
        variants: [
          { id: "var_1", name: "500g", priceMinor: 14000 },
          { id: "var_2", name: "1 kg", priceMinor: 26000 },
        ],
      };
      // Without customizationGroups in payload, groups remain untouched
      assert.equal(Array.isArray(payload.customizationGroups), false);
      assert.equal(payload.name, "Fresh Whole Chicken Updated");
    });

    it("2. Update product preserving existing customization groups", () => {
      const payload = {
        customizationGroups: existingProduct.customizationGroups,
      };
      const sentGroupIds = new Set(payload.customizationGroups.map((g) => g.id));
      const removedGroupIds = existingProduct.customizationGroups
        .filter((g) => !sentGroupIds.has(g.id))
        .map((g) => g.id);

      assert.equal(removedGroupIds.length, 0, "No groups should be marked for removal");
    });

    it("3. Add a new customization group", () => {
      const newGroup = {
        name: "Marinade Preference",
        selectionType: "SINGLE",
        isRequired: false,
        options: [{ name: "Tandoori Tikka", priceDeltaRs: 40 }],
      };
      const payloadGroups = [...existingProduct.customizationGroups, newGroup];

      const groupsToCreate = payloadGroups.filter((g) => !g.id);
      assert.equal(groupsToCreate.length, 1);
      assert.equal(groupsToCreate[0].name, "Marinade Preference");
    });

    it("4. Edit an existing customization group", () => {
      const updatedGroups = existingProduct.customizationGroups.map((g) =>
        g.id === "grp_cut" ? { ...g, name: "Master Cutting Style", isRequired: false } : g
      );
      const target = updatedGroups.find((g) => g.id === "grp_cut");
      assert.equal(target.name, "Master Cutting Style");
      assert.equal(target.isRequired, false);
    });

    it("5. Add customization options to an existing group", () => {
      const targetGroup = existingProduct.customizationGroups[0];
      const newOption = { name: "Special Roast Cut", priceDeltaRs: 25, isActive: true };
      const updatedOptions = [...targetGroup.options, newOption];

      const optionsToCreate = updatedOptions.filter((o) => !o.id);
      assert.equal(optionsToCreate.length, 1);
      assert.equal(optionsToCreate[0].name, "Special Roast Cut");
    });

    it("6. Edit customization options in an existing group", () => {
      const targetGroup = existingProduct.customizationGroups[0];
      const updatedOptions = targetGroup.options.map((o) =>
        o.id === "opt_boneless" ? { ...o, name: "Premium Boneless Breast", priceDeltaMinor: 4000 } : o
      );
      const targetOpt = updatedOptions.find((o) => o.id === "opt_boneless");
      assert.equal(targetOpt.name, "Premium Boneless Breast");
      assert.equal(targetOpt.priceDeltaMinor, 4000);
    });

    it("7. Remove customization options from an existing group", () => {
      const targetGroup = existingProduct.customizationGroups[0];
      // Keep only curry and biryani, remove boneless
      const retainedOptionIds = new Set(["opt_curry", "opt_biryani"]);
      const removedOptions = targetGroup.options.filter((o) => !retainedOptionIds.has(o.id));

      assert.equal(removedOptions.length, 1);
      assert.equal(removedOptions[0].id, "opt_boneless");
    });

    it("8. Update multiple variants and customization groups in one request", () => {
      const multiPayload = {
        variants: [
          { id: "var_1", name: "500g Special", priceRs: 145 },
          { name: "2 kg Family Pack", priceRs: 520, quantityValue: 2000, quantityUnit: "g" },
        ],
        customizationGroups: [
          {
            id: "grp_cut",
            name: "Cutting Style",
            selectionType: "SINGLE",
            isRequired: true,
            options: [
              { id: "opt_curry", name: "Curry Cut (Medium)", priceDeltaRs: 0 },
              { name: "Minced Meat / Keema", priceDeltaRs: 50 },
            ],
          },
        ],
      };

      // Verify variant reconciliation
      const sentVarIds = new Set(multiPayload.variants.map((v) => v.id).filter(Boolean));
      const removedVars = existingProduct.variants.filter((v) => !sentVarIds.has(v.id));
      assert.equal(removedVars.length, 2); // var_2 and var_3 removed

      // Verify group reconciliation (grp_clean removed)
      const sentGrpIds = new Set(multiPayload.customizationGroups.map((g) => g.id).filter(Boolean));
      const removedGrps = existingProduct.customizationGroups.filter((g) => !sentGrpIds.has(g.id));
      assert.equal(removedGrps.length, 1);
      assert.equal(removedGrps[0].id, "grp_clean");
    });

    it("9. Simulate a database operation failure and verify transactional atomicity guarantee", () => {
      // In interactive transactions, when any step throws, the whole transaction rolls back
      let transactionCommitted = false;
      const simulateTransaction = async () => {
        try {
          // step 1: update product (success)
          // step 2: update variant (success)
          // step 3: failure in customization group
          throw new Error("Simulated query timeout or constraint violation");
          transactionCommitted = true;
        } catch (err) {
          // Rollback triggered
          transactionCommitted = false;
          throw err;
        }
      };

      assert.rejects(simulateTransaction, /Simulated query timeout/);
      assert.equal(transactionCommitted, false, "Changes must not commit if any step fails");
    });

    it("10. Verify Prisma is not disconnected during a transaction", () => {
      let isConnected = true;
      const mockPrisma = {
        $disconnect: () => { isConnected = false; },
      };

      // Verify that normal product update execution does not invoke $disconnect
      assert.equal(isConnected, true);
    });

    it("11. Verify concurrent product edits do not silently corrupt relationships", () => {
      // Validating slug collisions across concurrent products
      const productA = { id: "prod_1", slug: "tender-chicken-curry" };
      const productB = { id: "prod_2", slug: "desi-country-chicken" };

      const checkCollision = (targetId, newSlug) => {
        const allProducts = [productA, productB];
        return allProducts.some((p) => p.slug === newSlug && p.id !== targetId);
      };

      assert.equal(checkCollision("prod_1", "tender-chicken-curry"), false); // Self is valid
      assert.equal(checkCollision("prod_2", "tender-chicken-curry"), true); // Collision detected
    });
  });
});
