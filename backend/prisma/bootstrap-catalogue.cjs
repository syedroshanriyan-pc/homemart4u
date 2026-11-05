/**
 * Idempotent Product Catalogue & Promotional Content Bootstrap
 * 
 * Safely upserts:
 * - 4 Categories (Fresh Chicken, Farm & Desi Eggs, Fresh Mutton [Coming Soon], Fish & Seafood [Coming Soon])
 * - 7 Chicken Products (Small Broiler, Big Broiler, Natti, Liver, Leg Piece, Lollipop, Wings)
 * - 2 Egg Products (Desi Eggs, Farm Eggs)
 * - Variants & Customization Groups
 * - 5 Published Promotional Cards (No fabricated discounts)
 * 
 * Safe for repeated execution without deleting customer accounts, orders, or existing records.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require(path.resolve(__dirname, "../../node_modules/@prisma/client"));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Starting idempotent bootstrap of HomeMart4U Catalogue & Promotional Cards...");

  // 1. Categories
  const categoriesData = [
    {
      name: "Fresh Chicken",
      slug: "fresh-chicken",
      department: "MEAT",
      description: "Farm-raised tender chicken, 100% Halal fresh cut daily",
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80",
      isActive: true,
      isComingSoon: false,
      displayOrder: 1,
    },
    {
      name: "Farm & Desi Eggs",
      slug: "eggs",
      department: "MEAT",
      description: "Authentic Desi Nati and high-protein farm-fresh eggs",
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=80",
      isActive: true,
      isComingSoon: false,
      displayOrder: 2,
    },
    {
      name: "Fresh Mutton",
      slug: "fresh-mutton",
      department: "MEAT",
      description: "Premium tender pasture-raised mutton — Coming Soon",
      imageUrl: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80",
      isActive: false,
      isComingSoon: true,
      displayOrder: 3,
    },
    {
      name: "Fish & Seafood",
      slug: "fish-seafood",
      department: "MEAT",
      description: "Cleaned and fresh water catch — Coming Soon",
      imageUrl: "https://images.unsplash.com/photo-1534940381676-e578c2e01df3?auto=format&fit=crop&w=600&q=80",
      isActive: false,
      isComingSoon: true,
      displayOrder: 4,
    },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      const updated = await prisma.category.update({
        where: { slug: cat.slug },
        data: cat,
      });
      categoryMap[cat.slug] = updated.id;
      console.log(`Updated Category: ${cat.name} (${updated.id})`);
    } else {
      const created = await prisma.category.create({ data: cat });
      categoryMap[cat.slug] = created.id;
      console.log(`Created Category: ${cat.name} (${created.id})`);
    }
  }

  // 2. Products Data Definition
  const products = [
    // --- 7 CHICKEN PRODUCTS ---
    {
      name: "Small Broiler Chicken",
      slug: "small-broiler-chicken",
      categorySlug: "fresh-chicken",
      description: "Tender, farm-fresh small broiler chicken, ideal for quick cooking, curries, and roasts. 100% Halal cut to order.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Small Broiler Chicken | HomeMart4U Mulbagal",
      seoDescription: "Order fresh Small Broiler Chicken in Mulbagal. 100% Halal and freshly portioned to order.",
      mrpMinor: 30000,
      savePriceText: "Save ₹40",
      badgeText: "Popular • Tender",
      displayOrder: 1,
      variants: [
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 14000, mrpMinor: 16000, isAvailable: true },
        { name: "1kg", pricingType: "WEIGHT", quantityValue: 1000, quantityUnit: "g", priceMinor: 26000, mrpMinor: 30000, isAvailable: true },
        { name: "1.5kg", pricingType: "WEIGHT", quantityValue: 1500, quantityUnit: "g", priceMinor: 38000, mrpMinor: 44000, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Skin Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Skin Retained", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          ],
        },
        {
          name: "Cutting Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 2,
          options: [
            { name: "Curry Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Biryani Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
            { name: "Small Pieces", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
            { name: "Medium Pieces", priceDeltaMinor: 0, displayOrder: 4, isActive: true },
            { name: "Whole Chicken", priceDeltaMinor: 0, displayOrder: 5, isActive: true },
          ],
        },
      ],
    },
    {
      name: "Big Broiler Chicken",
      slug: "big-broiler-chicken",
      categorySlug: "fresh-chicken",
      description: "Farm-reared mature broiler chicken with juicy meat, well-suited for family curries, gravies, and biryanis. 100% Halal.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Big Broiler Chicken | HomeMart4U Mulbagal",
      seoDescription: "Order fresh Big Broiler Chicken in Mulbagal. Rich juicy meat cut fresh on order.",
      mrpMinor: 29000,
      savePriceText: "Save ₹40",
      badgeText: "Family Size",
      displayOrder: 2,
      variants: [
        { name: "1kg", pricingType: "WEIGHT", quantityValue: 1000, quantityUnit: "g", priceMinor: 25000, mrpMinor: 29000, isAvailable: true },
        { name: "1.5kg", pricingType: "WEIGHT", quantityValue: 1500, quantityUnit: "g", priceMinor: 37000, mrpMinor: 43000, isAvailable: true },
        { name: "2kg", pricingType: "WEIGHT", quantityValue: 2000, quantityUnit: "g", priceMinor: 48000, mrpMinor: 56000, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Skin Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Skin Retained", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          ],
        },
        {
          name: "Cutting Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 2,
          options: [
            { name: "Curry Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Biryani Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
            { name: "Large Pieces", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
            { name: "Medium Pieces", priceDeltaMinor: 0, displayOrder: 4, isActive: true },
            { name: "Whole Chicken", priceDeltaMinor: 0, displayOrder: 5, isActive: true },
          ],
        },
      ],
    },
    {
      name: "Natti Chicken",
      slug: "natti-chicken",
      categorySlug: "fresh-chicken",
      description: "Authentic free-range country chicken (Natti/Nati) known for firm texture, rich traditional flavor, and hearty village-style curries.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Natti Chicken (Country Chicken) | HomeMart4U Mulbagal",
      seoDescription: "Authentic free-range Natti Chicken delivered fresh in Mulbagal. Rich traditional taste.",
      mrpMinor: 52000,
      savePriceText: "Save ₹60",
      badgeText: "Country Fresh • 100% Natti",
      displayOrder: 3,
      variants: [
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 24000, mrpMinor: 28000, isAvailable: true },
        { name: "1kg", pricingType: "WEIGHT", quantityValue: 1000, quantityUnit: "g", priceMinor: 46000, mrpMinor: 52000, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Skin Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Skin Singed / Burnt", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Skin Retained", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
            { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
          ],
        },
        {
          name: "Cutting Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 2,
          options: [
            { name: "Curry Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Small Pieces", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          ],
        },
      ],
    },
    {
      name: "Chicken Liver",
      slug: "chicken-liver",
      categorySlug: "fresh-chicken",
      description: "Fresh, clean, and tender chicken liver. Carefully separated, washed, and packed fresh daily.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Fresh Chicken Liver | HomeMart4U Mulbagal",
      seoDescription: "Buy fresh, clean chicken liver in Mulbagal. Rich in iron, prepared clean and packed fresh.",
      mrpMinor: 16000,
      savePriceText: "Save ₹30",
      badgeText: "Fresh Cleaned",
      displayOrder: 4,
      variants: [
        { name: "250g", pricingType: "WEIGHT", quantityValue: 250, quantityUnit: "g", priceMinor: 7000, mrpMinor: 8500, isAvailable: true },
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 13000, mrpMinor: 16000, isAvailable: true },
      ],
      customizationGroups: [],
    },
    {
      name: "Chicken Leg Piece",
      slug: "chicken-leg-piece",
      categorySlug: "fresh-chicken",
      description: "Plump, tender whole chicken leg pieces (drumstick and thigh combined). Perfect for tandoor, frying, or biryani.",
      productType: "QUANTITY",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1527477245898-790c0f7e5148?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Chicken Leg Piece | HomeMart4U Mulbagal",
      seoDescription: "Order juicy chicken leg pieces in Mulbagal. Ideal for tandoori, fry, and biryani.",
      mrpMinor: 31000,
      savePriceText: "Save ₹40",
      badgeText: "Juicy Cuts",
      displayOrder: 5,
      variants: [
        { name: "2 pcs", pricingType: "QUANTITY", quantityValue: 2, quantityUnit: "pcs", priceMinor: 14000, mrpMinor: 16000, isAvailable: true },
        { name: "4 pcs", pricingType: "QUANTITY", quantityValue: 4, quantityUnit: "pcs", priceMinor: 27000, mrpMinor: 31000, isAvailable: true },
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 16000, mrpMinor: 19000, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Preparation Style",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Whole Leg Piece", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Drumstick & Thigh Separated", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
            { name: "Slit Cuts for Marination", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
          ],
        },
      ],
    },
    {
      name: "Chicken Lollipop",
      slug: "chicken-lollipop",
      categorySlug: "fresh-chicken",
      description: "Expertly French-cut chicken wingettes shaped into neat lollipops with clean bone handles for effortless frying and starters.",
      productType: "QUANTITY",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Chicken Lollipop | HomeMart4U Mulbagal",
      seoDescription: "Order fresh Chicken Lollipop cuts in Mulbagal. Ready to fry with clean bone handle.",
      mrpMinor: 34000,
      savePriceText: "Save ₹50",
      badgeText: "Party Starter",
      displayOrder: 6,
      variants: [
        { name: "6 pcs", pricingType: "QUANTITY", quantityValue: 6, quantityUnit: "pcs", priceMinor: 15000, mrpMinor: 17500, isAvailable: true },
        { name: "12 pcs", pricingType: "QUANTITY", quantityValue: 12, quantityUnit: "pcs", priceMinor: 29000, mrpMinor: 34000, isAvailable: true },
      ],
      customizationGroups: [],
    },
    {
      name: "Chicken Wings",
      slug: "chicken-wings",
      categorySlug: "fresh-chicken",
      description: "Fresh, juicy chicken wings with skin. Excellent for roasting, frying, crisps, or spicy barbecue appetizers.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1524182576066-1be96137b0ec?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Fresh Chicken Wings | HomeMart4U Mulbagal",
      seoDescription: "Order juicy chicken wings in Mulbagal. Great for barbecue, crispy frying, and snacks.",
      mrpMinor: 29500,
      savePriceText: "Save ₹45",
      badgeText: "Crispy Fry Cuts",
      displayOrder: 7,
      variants: [
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 13000, mrpMinor: 15500, isAvailable: true },
        { name: "1kg", pricingType: "WEIGHT", quantityValue: 1000, quantityUnit: "g", priceMinor: 25000, mrpMinor: 29500, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Wing Style",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Whole Wings", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Split Wingette & Drumette", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          ],
        },
      ],
    },

    // --- 2 EGG PRODUCTS ---
    {
      name: "Pure Country Desi Nati Eggs",
      slug: "pure-country-desi-nati-eggs",
      categorySlug: "eggs",
      description: "Authentic country-sourced Desi / Nati eggs with natural brown shells and rich golden yolks. Sourced from local free-range poultry.",
      productType: "QUANTITY",
      foodType: "EGG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Pure Country Desi Nati Eggs | HomeMart4U Mulbagal",
      seoDescription: "Buy natural Desi Nati Eggs in Mulbagal. Country-sourced, fresh brown eggs in protective pack.",
      mrpMinor: 43000,
      savePriceText: "Save ₹50",
      badgeText: "Country Desi • Nati",
      displayOrder: 8,
      variants: [
        { name: "6 eggs", pricingType: "QUANTITY", quantityValue: 6, quantityUnit: "eggs", priceMinor: 8000, mrpMinor: 9500, isAvailable: true },
        { name: "12 eggs", pricingType: "QUANTITY", quantityValue: 12, quantityUnit: "eggs", priceMinor: 15500, mrpMinor: 18000, isAvailable: true },
        { name: "30 eggs", pricingType: "QUANTITY", quantityValue: 30, quantityUnit: "eggs", priceMinor: 38000, mrpMinor: 43000, isAvailable: true },
      ],
      customizationGroups: [],
    },
    {
      name: "Fresh Tender Chicken Curry Cut",
      slug: "fresh-tender-chicken-curry-cut",
      categorySlug: "fresh-chicken",
      description: "Farm-fresh tender chicken curry cut portions prepared cleanly to order. 100% Halal certified.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Fresh Tender Chicken Curry Cut | HomeMart4U",
      seoDescription: "Order fresh chicken curry cut portions with your choice of skin and cut size.",
      mrpMinor: 30000,
      savePriceText: "Save ₹40",
      badgeText: "Curry Cut Special",
      displayOrder: 9,
      variants: [
        { name: "500g", pricingType: "WEIGHT", quantityValue: 500, quantityUnit: "g", priceMinor: 14000, mrpMinor: 16000, isAvailable: true },
        { name: "1kg", pricingType: "WEIGHT", quantityValue: 1000, quantityUnit: "g", priceMinor: 26000, mrpMinor: 30000, isAvailable: true },
      ],
      customizationGroups: [
        {
          name: "Skin Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: [
            { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Skin On", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
          ],
        },
        {
          name: "Cutting Size",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 2,
          options: [
            { name: "Medium Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
            { name: "Small Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
            { name: "Large Cut", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
          ],
        },
      ],
    },
    {
      name: "Desi Eggs",
      slug: "desi-eggs",
      categorySlug: "eggs",
      description: "Country-sourced Desi / Nati eggs with natural brown shells and rich golden yolks. Sourced from local free-range poultry.",
      productType: "QUANTITY",
      foodType: "EGG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Desi Eggs (Nati Eggs) | HomeMart4U Mulbagal",
      seoDescription: "Buy natural Desi Nati Eggs in Mulbagal. Country-sourced, fresh brown eggs in protective pack.",
      mrpMinor: 43000,
      savePriceText: "Save ₹50",
      badgeText: "Country Desi • Nati",
      displayOrder: 8,
      variants: [
        { name: "6 eggs", pricingType: "QUANTITY", quantityValue: 6, quantityUnit: "eggs", priceMinor: 8000, mrpMinor: 9500, isAvailable: true },
        { name: "12 eggs", pricingType: "QUANTITY", quantityValue: 12, quantityUnit: "eggs", priceMinor: 15500, mrpMinor: 18000, isAvailable: true },
        { name: "30 eggs", pricingType: "QUANTITY", quantityValue: 30, quantityUnit: "eggs", priceMinor: 38000, mrpMinor: 43000, isAvailable: true },
      ],
      customizationGroups: [],
    },
    {
      name: "Farm Eggs",
      slug: "farm-eggs",
      categorySlug: "eggs",
      description: "Graded, fresh white-shelled poultry farm eggs collected daily. Packed in protective trays.",
      productType: "QUANTITY",
      foodType: "EGG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Fresh Farm Eggs | HomeMart4U Mulbagal",
      seoDescription: "Order fresh poultry Farm Eggs in Mulbagal. Clean white-shelled eggs in safe packs.",
      mrpMinor: 24000,
      savePriceText: "Save ₹30",
      badgeText: "Daily Farm Fresh",
      displayOrder: 9,
      variants: [
        { name: "6 eggs", pricingType: "QUANTITY", quantityValue: 6, quantityUnit: "eggs", priceMinor: 4500, mrpMinor: 5500, isAvailable: true },
        { name: "12 eggs", pricingType: "QUANTITY", quantityValue: 12, quantityUnit: "eggs", priceMinor: 8500, mrpMinor: 10000, isAvailable: true },
        { name: "30 eggs", pricingType: "QUANTITY", quantityValue: 30, quantityUnit: "eggs", priceMinor: 21000, mrpMinor: 24000, isAvailable: true },
      ],
      customizationGroups: [],
    },
  ];

  // 3. Upsert Products, Variants & Customizations
  const productIds = {};
  for (const p of products) {
    const categoryId = categoryMap[p.categorySlug];
    if (!categoryId) {
      console.error(`Category missing for slug: ${p.categorySlug}`);
      continue;
    }

    const { categorySlug, variants, customizationGroups, ...productFields } = p;

    let product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (product) {
      product = await prisma.product.update({
        where: { slug: p.slug },
        data: {
          ...productFields,
          categoryId,
        },
      });
      console.log(`Updated Product: ${product.name} (${product.id})`);
    } else {
      product = await prisma.product.create({
        data: {
          ...productFields,
          categoryId,
        },
      });
      console.log(`Created Product: ${product.name} (${product.id})`);
    }
    productIds[p.slug] = product.id;

    // Upsert Variants
    for (const v of variants) {
      const existingVar = await prisma.productVariant.findFirst({
        where: { productId: product.id, name: v.name },
      });
      if (existingVar) {
        await prisma.productVariant.update({
          where: { id: existingVar.id },
          data: {
            pricingType: v.pricingType,
            quantityValue: v.quantityValue,
            quantityUnit: v.quantityUnit,
            priceMinor: v.priceMinor,
            mrpMinor: v.mrpMinor,
            isAvailable: v.isAvailable,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: v.name,
            pricingType: v.pricingType,
            quantityValue: v.quantityValue,
            quantityUnit: v.quantityUnit,
            priceMinor: v.priceMinor,
            mrpMinor: v.mrpMinor,
            isAvailable: v.isAvailable,
          },
        });
      }
    }

    // Upsert Customization Groups & Options
    for (const g of customizationGroups) {
      let group = await prisma.customizationGroup.findFirst({
        where: { productId: product.id, name: g.name },
      });
      if (group) {
        group = await prisma.customizationGroup.update({
          where: { id: group.id },
          data: {
            selectionType: g.selectionType,
            isRequired: g.isRequired,
            displayOrder: g.displayOrder,
          },
        });
      } else {
        group = await prisma.customizationGroup.create({
          data: {
            productId: product.id,
            name: g.name,
            selectionType: g.selectionType,
            isRequired: g.isRequired,
            displayOrder: g.displayOrder,
          },
        });
      }

      for (const opt of g.options) {
        const existingOpt = await prisma.customizationOption.findFirst({
          where: { groupId: group.id, name: opt.name },
        });
        if (existingOpt) {
          await prisma.customizationOption.update({
            where: { id: existingOpt.id },
            data: {
              priceDeltaMinor: opt.priceDeltaMinor,
              displayOrder: opt.displayOrder,
              isActive: opt.isActive,
            },
          });
        } else {
          await prisma.customizationOption.create({
            data: {
              groupId: group.id,
              name: opt.name,
              priceDeltaMinor: opt.priceDeltaMinor,
              displayOrder: opt.displayOrder,
              isActive: opt.isActive,
            },
          });
        }
      }
    }
  }

  // 4. Upsert 5 Promotional Cards (OfferContent)
  const promotionalCards = [
    {
      title: "Fresh Chicken",
      description: "Explore our available chicken selection.",
      ctaLabel: "Explore Chicken",
      ctaUrl: "/menu?category=fresh-chicken",
      type: "OFFER",
      status: "PUBLISHED",
      priority: 5,
    },
    {
      title: "Desi Eggs",
      description: "Explore our available desi egg options.",
      ctaLabel: "View Eggs",
      ctaUrl: "/menu?category=eggs",
      type: "OFFER",
      status: "PUBLISHED",
      priority: 4,
    },
    {
      title: "Farm Eggs",
      description: "Browse our farm egg selection.",
      ctaLabel: "Explore Eggs",
      ctaUrl: "/menu?category=eggs",
      type: "OFFER",
      status: "PUBLISHED",
      priority: 3,
    },
    {
      title: "Chicken Specials",
      description: "Explore our chicken cuts and available selections.",
      ctaLabel: "Shop Chicken",
      ctaUrl: "/menu?category=fresh-chicken",
      type: "OFFER",
      status: "PUBLISHED",
      priority: 2,
    },
    {
      title: "More Choices Coming Soon",
      description: "Mutton and fish selections are planned for the future.",
      ctaLabel: "Explore Available Products",
      ctaUrl: "/menu",
      type: "ANNOUNCEMENT",
      status: "PUBLISHED",
      priority: 1,
    },
  ];

  for (const card of promotionalCards) {
    const existing = await prisma.offerContent.findFirst({
      where: { title: card.title },
    });
    if (existing) {
      await prisma.offerContent.update({
        where: { id: existing.id },
        data: {
          description: card.description,
          ctaLabel: card.ctaLabel,
          ctaUrl: card.ctaUrl,
          type: card.type,
          status: card.status,
          priority: card.priority,
        },
      });
      console.log(`Updated Promotional Card: ${card.title} (${existing.id})`);
    } else {
      const created = await prisma.offerContent.create({
        data: card,
      });
      console.log(`Created Promotional Card: ${card.title} (${created.id})`);
    }
  }

  console.log("Bootstrap completed successfully!");
  console.log("Product IDs summary:", productIds);
}

main()
  .catch((e) => {
    console.error("Bootstrap error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

