require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Applying database migrations safely...");

  // 1. Add isComingSoon column to Category
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "isComingSoon" BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log("Verified Category.isComingSoon column exists");

  // 2. Create OfferContent table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OfferContent" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'OFFER',
      "imageUrl" TEXT,
      "ctaLabel" TEXT,
      "ctaUrl" TEXT,
      "couponCode" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "priority" INTEGER NOT NULL DEFAULT 0,
      "startDate" TIMESTAMP(3),
      "endDate" TIMESTAMP(3),
      "createdBy" TEXT,
      "updatedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OfferContent_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "OfferContent_status_priority_idx" ON "OfferContent"("status", "priority");
  `);
  console.log("Verified OfferContent table and indexes exist");

  // 3. Update Category states:
  // Deactivate grocery categories safely (preserving all order history)
  await prisma.category.updateMany({
    where: {
      OR: [
        { department: 'GROCERY' },
        { slug: { in: ['beverages', 'chilled-beverages', 'dairy-eggs-bread', 'atta-rice-dal', 'oils-ghee', 'spices-masalas', 'fresh-vegetables', 'tea-beverages'] } }
      ]
    },
    data: {
      isActive: false,
    }
  });
  console.log("Deactivated grocery categories from active customer catalogue");

  // Mark Mutton and Fish as Coming Soon
  await prisma.category.updateMany({
    where: {
      slug: { in: ['fresh-mutton', 'fish-seafood', 'mutton', 'fish'] }
    },
    data: {
      isActive: true,
      isComingSoon: true,
    }
  });
  console.log("Configured Mutton and Fish as Coming Soon (non-purchasable)");

  // Ensure Chicken and Eggs are active and purchasable
  await prisma.category.updateMany({
    where: {
      slug: { in: ['fresh-chicken', 'masala-special', 'eggs'] }
    },
    data: {
      isActive: true,
      isComingSoon: false,
      department: 'MEAT'
    }
  });
  console.log("Ensured Chicken and Eggs are active and purchasable");

  // 4. Ensure Egg Category has BOTH distinct products:
  // 1) Desi Eggs (Pure Country Desi Nati Eggs)
  // 2) Farm Eggs (Farm Fresh Table Eggs)
  const eggCategory = await prisma.category.findFirst({
    where: { slug: 'eggs' }
  });

  if (eggCategory) {
    // 4A. Desi Eggs
    let desiEgg = await prisma.product.findUnique({
      where: { slug: 'pure-country-desi-nati-eggs' },
      include: { variants: true }
    });
    if (!desiEgg) {
      desiEgg = await prisma.product.create({
        data: {
          categoryId: eggCategory.id,
          name: "Pure Country Desi Nati Eggs",
          slug: "pure-country-desi-nati-eggs",
          description: "100% natural, authentic free-range country desi eggs. High protein, rich golden yolk, farm-sourced daily.",
          imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80",
          productType: "PIECE",
          foodType: "EGG",
          isAvailable: true,
          isActive: true,
          mrpMinor: 12000,
          displayOrder: 1,
          variants: {
            create: [
              { name: "6 Eggs Pack", pricingType: "PIECE", quantityValue: 6, quantityUnit: "pc", priceMinor: 8500, mrpMinor: 10000, isAvailable: true },
              { name: "12 Eggs Pack", pricingType: "PIECE", quantityValue: 12, quantityUnit: "pc", priceMinor: 16000, mrpMinor: 19000, isAvailable: true },
              { name: "30 Eggs Tray", pricingType: "PIECE", quantityValue: 30, quantityUnit: "pc", priceMinor: 38000, mrpMinor: 45000, isAvailable: true },
            ]
          }
        },
        include: { variants: true }
      });
      console.log("Created Desi Eggs product with variants");
    }

    // 4B. Farm Eggs
    let farmEgg = await prisma.product.findUnique({
      where: { slug: 'farm-fresh-table-eggs' },
      include: { variants: true }
    });
    if (!farmEgg) {
      farmEgg = await prisma.product.create({
        data: {
          categoryId: eggCategory.id,
          name: "Farm Fresh Table Eggs",
          slug: "farm-fresh-table-eggs",
          description: "Graded, washed, and sanitized daily farm fresh white table eggs. Essential nutrition at wholesale prices.",
          imageUrl: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&q=80",
          productType: "PIECE",
          foodType: "EGG",
          isAvailable: true,
          isActive: true,
          mrpMinor: 9000,
          displayOrder: 2,
          variants: {
            create: [
              { name: "6 Eggs Pack", pricingType: "PIECE", quantityValue: 6, quantityUnit: "pc", priceMinor: 4800, mrpMinor: 6000, isAvailable: true },
              { name: "12 Eggs Pack", pricingType: "PIECE", quantityValue: 12, quantityUnit: "pc", priceMinor: 9200, mrpMinor: 11500, isAvailable: true },
              { name: "30 Eggs Tray", pricingType: "PIECE", quantityValue: 30, quantityUnit: "pc", priceMinor: 22000, mrpMinor: 26000, isAvailable: true },
            ]
          }
        },
        include: { variants: true }
      });
      console.log("Created Farm Eggs product with variants");
    }
  }

  // 5. Seed default chicken customization groups on Chicken products
  const chickenProducts = await prisma.product.findMany({
    where: {
      category: { slug: { in: ['fresh-chicken', 'masala-special'] } }
    },
    include: {
      customizationGroups: {
        include: { options: true }
      }
    }
  });

  for (const prod of chickenProducts) {
    // Only configure cutting/skin for products that are cuts (e.g. curry cut, whole chicken, etc.)
    const isBoneless = prod.slug.includes("boneless");
    const isWings = prod.slug.includes("wings");
    const isDrumsticks = prod.slug.includes("drumsticks");

    // Check if Skin Preference group exists
    let skinGroup = prod.customizationGroups.find(g => g.name.toLowerCase().includes("skin"));
    if (!skinGroup && !isBoneless) {
      skinGroup = await prisma.customizationGroup.create({
        data: {
          productId: prod.id,
          name: "Skin Preference",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 1,
          options: {
            create: [
              { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
              { name: "Skin On", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
              { name: "Skin Singed / Burnt", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
            ]
          }
        },
        include: { options: true }
      });
      console.log(`Added Skin Preference options to: ${prod.name}`);
    }

    // Check if Cut Size group exists
    let cutGroup = prod.customizationGroups.find(g => g.name.toLowerCase().includes("cut") || g.name.toLowerCase().includes("size"));
    if (!cutGroup && !isWings && !isDrumsticks) {
      cutGroup = await prisma.customizationGroup.create({
        data: {
          productId: prod.id,
          name: "Cutting Size",
          selectionType: "SINGLE",
          isRequired: true,
          displayOrder: 2,
          options: {
            create: [
              { name: "Medium Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
              { name: "Small Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
              { name: "Large Cut", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
            ]
          }
        },
        include: { options: true }
      });
      console.log(`Added Cutting Size options to: ${prod.name}`);
    }
  }

  // 6. Seed initial OfferContent items for promotional carousel (max 5)
  const existingOffers = await prisma.offerContent.count();
  if (existingOffers === 0) {
    await prisma.offerContent.createMany({
      data: [
        {
          title: "Fresh Farm Meat Delivered in 20 Mins",
          description: "100% hygienic, antibiotic-free tender chicken and fresh eggs delivered right to your doorstep in Mulbagal.",
          type: "OFFER",
          ctaLabel: "Order Fresh Chicken",
          ctaUrl: "/menu/fresh-chicken",
          couponCode: "WELCOME100",
          status: "PUBLISHED",
          priority: 5,
        },
        {
          title: "Authentic Desi Nati Eggs Available Daily",
          description: "Directly sourced from trusted local farms. Rich in natural nutrients with deep golden yolks.",
          type: "OFFER",
          ctaLabel: "Shop Fresh Eggs",
          ctaUrl: "/menu/eggs",
          couponCode: "EGGDEAL",
          status: "PUBLISHED",
          priority: 4,
        },
        {
          title: "Customized Cuts for Your Kitchen",
          description: "Select Skin-On, Skin-Removed, or Singed, with Small, Medium, or Large cuts prepared fresh to order.",
          type: "ANNOUNCEMENT",
          ctaLabel: "Explore Cuts",
          ctaUrl: "/menu/fresh-chicken",
          status: "PUBLISHED",
          priority: 3,
        },
      ]
    });
    console.log("Seeded initial published promotional cards in OfferContent CMS");
  }

  console.log("Database migration and catalogue update completed successfully!");
}

main().catch(e => {
  console.error("Migration error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
