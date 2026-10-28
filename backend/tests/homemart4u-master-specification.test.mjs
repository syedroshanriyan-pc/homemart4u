import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

test.describe("Homemart4u Master Specification Compliance Suite", () => {
  test.after(async () => {
    await prisma.$disconnect();
  });

  test("1. Business Scope: Grocery categories are deactivated and absent from active catalogue", async () => {
    const activeGroceries = await prisma.category.findMany({
      where: {
        isActive: true,
        OR: [
          { department: "GROCERY" },
          { slug: { in: ["atta-rice-dal", "oils-ghee", "dairy-eggs-bread", "spices-masalas", "fresh-vegetables", "beverages"] } },
        ],
      },
    });
    assert.equal(activeGroceries.length, 0, "No grocery categories should be active in customer catalogue");
  });

  test("2. Catalogue: Chicken and Eggs are active purchasable categories", async () => {
    const chickenCat = await prisma.category.findUnique({ where: { slug: "fresh-chicken" } });
    assert.ok(chickenCat, "Fresh chicken category must exist");
    assert.equal(chickenCat.isActive, true, "Fresh chicken category must be active");
    assert.equal(chickenCat.isComingSoon, false, "Fresh chicken category must not be Coming Soon");

    const eggsCat = await prisma.category.findUnique({ where: { slug: "eggs" } });
    assert.ok(eggsCat, "Eggs category must exist");
    assert.equal(eggsCat.isActive, true, "Eggs category must be active");
    assert.equal(eggsCat.isComingSoon, false, "Eggs category must not be Coming Soon");
  });

  test("3. Coming Soon Categories: Mutton and Fish are marked as Coming Soon (non-purchasable)", async () => {
    const soonCats = await prisma.category.findMany({
      where: {
        slug: { in: ["fresh-mutton", "fish-seafood"] },
      },
    });
    assert.ok(soonCats.length >= 2, "Mutton and fish categories must exist");
    for (const cat of soonCats) {
      assert.equal(cat.isComingSoon, true, `Category ${cat.name} must have isComingSoon=true`);
    }
  });

  test("4. Egg Catalogue: Desi Eggs and Farm Eggs are distinct products", async () => {
    const desiEgg = await prisma.product.findUnique({
      where: { slug: "pure-country-desi-nati-eggs" },
      include: { variants: true },
    });
    assert.ok(desiEgg, "Pure Country Desi Nati Eggs product must exist");
    assert.equal(desiEgg.isActive, true);
    assert.ok(desiEgg.variants.length > 0, "Desi eggs must have configured variants");

    const farmEgg = await prisma.product.findUnique({
      where: { slug: "farm-fresh-table-eggs" },
      include: { variants: true },
    });
    assert.ok(farmEgg, "Farm Fresh Table Eggs product must exist");
    assert.equal(farmEgg.isActive, true);
    assert.ok(farmEgg.variants.length > 0, "Farm eggs must have configured variants");

    assert.notEqual(desiEgg.id, farmEgg.id, "Desi and Farm eggs must be separate database records");
  });

  test("5. Chicken Customization: Skin and Cutting Size preparation preferences are configured", async () => {
    const curryCut = await prisma.product.findUnique({
      where: { slug: "fresh-tender-chicken-curry-cut" },
      include: {
        customizationGroups: {
          include: { options: true },
        },
      },
    });
    assert.ok(curryCut, "Curry cut chicken product must exist");

    const skinGroup = curryCut.customizationGroups.find((g) => g.name.toLowerCase().includes("skin"));
    assert.ok(skinGroup, "Skin Preference customization group must exist");
    const skinOptionNames = skinGroup.options.map((o) => o.name);
    assert.ok(skinOptionNames.includes("Skin Removed"), "Must include Skin Removed");
    assert.ok(skinOptionNames.includes("Skin On"), "Must include Skin On");

    const cutGroup = curryCut.customizationGroups.find((g) => g.name.toLowerCase().includes("cut") || g.name.toLowerCase().includes("size"));
    assert.ok(cutGroup, "Cutting Size customization group must exist");
    const cutOptionNames = cutGroup.options.map((o) => o.name);
    assert.ok(cutOptionNames.includes("Medium Cut"), "Must include Medium Cut");
    assert.ok(cutOptionNames.includes("Small Cut"), "Must include Small Cut");
    assert.ok(cutOptionNames.includes("Large Cut"), "Must include Large Cut");
  });

  test("6. Promotional Carousel CMS: OfferContent table supports priority, status, safe URLs", async () => {
    const offers = await prisma.offerContent.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { priority: "desc" },
      take: 5,
    });
    assert.ok(offers.length <= 5, "Promotions must return at most 5 cards");
    assert.ok(offers.length > 0, "Initial seeded published cards should be available");

    for (const offer of offers) {
      assert.ok(offer.title, "Offer must have a title");
      assert.ok(offer.description, "Offer must have a description");
      if (offer.ctaUrl) {
        assert.ok(offer.ctaUrl.startsWith("/"), "CTA URL must be a safe relative path starting with /");
      }
    }
  });

  test("7. Delivery Collection Accounting: Persisted delivery collections distinguish CASH vs UPI", async () => {
    const collections = await prisma.deliveryCollection.findMany({
      select: {
        collectionMethod: true,
        verificationStatus: true,
        amountMinor: true,
      },
    });

    for (const c of collections) {
      assert.ok(
        ["CASH", "UPI_MANUAL_VERIFIED", "ONLINE_DOORSTEP", "PREPAID"].includes(c.collectionMethod),
        `Valid collection method expected, got ${c.collectionMethod}`
      );
      if (c.collectionMethod === "UPI_MANUAL_VERIFIED") {
        assert.equal(c.verificationStatus, "MANUAL_AGENT_CONFIRMED");
      }
    }
  });
});
