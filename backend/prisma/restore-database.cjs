/**
 * Homemart4u Database Restore Utility
 * High-performance batch restoration from `data-backup.json` into target PostgreSQL.
 * 
 * Usage:
 *   node backend/prisma/restore-database.cjs
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require(path.resolve(__dirname, "../../node_modules/@prisma/client"));

const targetDbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!targetDbUrl) {
  console.error("FATAL: DATABASE_URL or DIRECT_URL environment variable is required.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: targetDbUrl,
    },
  },
});

async function restoreDatabase() {
  const backupFile = path.resolve(__dirname, "data-backup.json");
  if (!fs.existsSync(backupFile)) {
    console.error(`FATAL: Backup file not found at ${backupFile}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(backupFile, "utf-8"));
  console.log(`Starting database restoration from backup (snapshot from ${snapshot.exportedAt})...`);

  const { data, counts } = snapshot;
  console.log("Entities to restore:", counts);

  try {
    // 1. Users
    console.log(`\n1. Restoring ${data.users.length} Users...`);
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { mobile: u.mobile },
        create: {
          id: u.id,
          role: u.role,
          name: u.name,
          mobile: u.mobile,
          email: u.email,
          passwordHash: u.passwordHash,
          status: u.status,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
        update: {
          role: u.role,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          status: u.status,
        },
      });
      console.log(`  - User: ${u.name} (${u.role})`);
    }

    // 2. Categories
    console.log(`\n2. Restoring ${data.categories.length} Categories...`);
    const categoryMap = new Map();
    // Root categories first
    const rootCategories = data.categories.filter((c) => !c.parentId);
    for (const c of rootCategories) {
      const saved = await prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          department: c.department,
          description: c.description,
          imageUrl: c.imageUrl,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
          displayOrder: c.displayOrder,
        },
        update: {
          name: c.name,
          department: c.department,
          description: c.description,
          imageUrl: c.imageUrl,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
          displayOrder: c.displayOrder,
        },
      });
      categoryMap.set(c.id, saved.id);
      console.log(`  - Category: ${saved.name} (${saved.slug})`);
    }

    // Child categories second
    const childCategories = data.categories.filter((c) => c.parentId);
    for (const c of childCategories) {
      const mappedParentId = categoryMap.get(c.parentId) || c.parentId;
      const saved = await prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          id: c.id,
          parentId: mappedParentId,
          name: c.name,
          slug: c.slug,
          department: c.department,
          description: c.description,
          imageUrl: c.imageUrl,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
          displayOrder: c.displayOrder,
        },
        update: {
          parentId: mappedParentId,
          name: c.name,
          department: c.department,
          description: c.description,
          imageUrl: c.imageUrl,
          isActive: c.isActive,
          isComingSoon: c.isComingSoon,
          displayOrder: c.displayOrder,
        },
      });
      categoryMap.set(c.id, saved.id);
      console.log(`  - Subcategory: ${saved.name} -> Parent: ${mappedParentId}`);
    }

    // 3. Products
    console.log(`\n3. Restoring ${data.products.length} Products...`);
    const productMap = new Map();
    for (const p of data.products) {
      const mappedCatId = categoryMap.get(p.categoryId) || p.categoryId;
      const saved = await prisma.product.upsert({
        where: { slug: p.slug },
        create: {
          id: p.id,
          categoryId: mappedCatId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          productType: p.productType,
          isActive: p.isActive,
          isAvailable: p.isAvailable,
          imageUrl: p.imageUrl,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          foodType: p.foodType,
          isHalal: p.isHalal,
          mrpMinor: p.mrpMinor,
          savePriceText: p.savePriceText,
          badgeText: p.badgeText,
          displayOrder: p.displayOrder,
        },
        update: {
          categoryId: mappedCatId,
          name: p.name,
          description: p.description,
          productType: p.productType,
          isActive: p.isActive,
          isAvailable: p.isAvailable,
          imageUrl: p.imageUrl,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          foodType: p.foodType,
          isHalal: p.isHalal,
          mrpMinor: p.mrpMinor,
          savePriceText: p.savePriceText,
          badgeText: p.badgeText,
          displayOrder: p.displayOrder,
        },
      });
      productMap.set(p.id, saved.id);
      console.log(`  - Product: ${saved.name} (${saved.slug})`);
    }

    // 4. Product Variants (Batch Insert with mapped product IDs)
    console.log(`\n4. Restoring ${data.variants.length} Product Variants...`);
    const variantsToCreate = data.variants.map((v) => ({
      id: v.id,
      productId: productMap.get(v.productId) || v.productId,
      name: v.name,
      pricingType: v.pricingType,
      quantityValue: v.quantityValue,
      quantityUnit: v.quantityUnit,
      priceMinor: v.priceMinor,
      mrpMinor: v.mrpMinor,
      isAvailable: v.isAvailable,
    }));
    const variantRes = await prisma.productVariant.createMany({
      data: variantsToCreate,
      skipDuplicates: true,
    });
    console.log(`  - Batch inserted product variants: count = ${variantRes.count}`);

    // 5. Customization Groups & Options
    console.log(`\n5. Restoring ${data.customizationGroups.length} Customization Groups...`);
    const groupMap = new Map();
    for (const cg of data.customizationGroups) {
      const targetProductId = productMap.get(cg.productId) || cg.productId;
      const savedGroup = await prisma.customizationGroup.upsert({
        where: { id: cg.id },
        create: {
          id: cg.id,
          productId: targetProductId,
          name: cg.name,
          selectionType: cg.selectionType,
          isRequired: cg.isRequired,
          displayOrder: cg.displayOrder,
        },
        update: {
          productId: targetProductId,
          name: cg.name,
          selectionType: cg.selectionType,
          isRequired: cg.isRequired,
          displayOrder: cg.displayOrder,
        },
      });
      groupMap.set(cg.id, savedGroup.id);
    }
    console.log(`  - Restored ${data.customizationGroups.length} customization groups`);

    console.log(`\n6. Restoring ${data.customizationOptions.length} Customization Options...`);
    const optionsToCreate = data.customizationOptions.map((co) => ({
      id: co.id,
      groupId: groupMap.get(co.groupId) || co.groupId,
      name: co.name,
      priceDeltaMinor: co.priceDeltaMinor,
      isActive: co.isActive,
      displayOrder: co.displayOrder,
    }));
    const optionRes = await prisma.customizationOption.createMany({
      data: optionsToCreate,
      skipDuplicates: true,
    });
    console.log(`  - Batch inserted customization options: count = ${optionRes.count}`);

    // 7. Coupons
    console.log(`\n7. Restoring ${data.coupons.length} Coupons...`);
    const couponsToCreate = data.coupons.map((cp) => ({
      id: cp.id,
      code: cp.code,
      type: cp.type,
      value: cp.value,
      minimumOrderMinor: cp.minimumOrderMinor,
      maximumDiscountMinor: cp.maximumDiscountMinor,
      buyQuantity: cp.buyQuantity,
      getQuantity: cp.getQuantity,
      freeDelivery: cp.freeDelivery,
      usageLimit: cp.usageLimit,
      perUserLimit: cp.perUserLimit,
      startsAt: new Date(cp.startsAt),
      expiresAt: new Date(cp.expiresAt),
      isActive: cp.isActive,
    }));
    const couponRes = await prisma.coupon.createMany({
      data: couponsToCreate,
      skipDuplicates: true,
    });
    console.log(`  - Batch inserted coupons: count = ${couponRes.count}`);

    // 8. Offers & Promotional Cards
    console.log(`\n8. Restoring ${data.offers.length} Promotional Cards & Offers...`);
    const offersToCreate = data.offers.map((off) => ({
      id: off.id,
      title: off.title,
      description: off.description,
      type: off.type,
      imageUrl: off.imageUrl,
      ctaLabel: off.ctaLabel,
      ctaUrl: off.ctaUrl,
      couponCode: off.couponCode,
      status: off.status,
      priority: off.priority,
      startDate: off.startDate ? new Date(off.startDate) : null,
      endDate: off.endDate ? new Date(off.endDate) : null,
      createdBy: off.createdBy,
      updatedBy: off.updatedBy,
    }));
    const offerRes = await prisma.offerContent.createMany({
      data: offersToCreate,
      skipDuplicates: true,
    });
    console.log(`  - Batch inserted promotional offers & cards: count = ${offerRes.count}`);

    // 9. System Settings
    console.log(`\n9. Restoring ${data.systemSettings.length} System Settings...`);
    const settingsToCreate = data.systemSettings.map((ss) => ({
      id: ss.id,
      key: ss.key,
      value: ss.value,
      description: ss.description,
    }));
    const settingRes = await prisma.systemSetting.createMany({
      data: settingsToCreate,
      skipDuplicates: true,
    });
    console.log(`  - Batch inserted system settings: count = ${settingRes.count}`);

    console.log("\n========================================================");
    console.log("DATABASE RESTORATION COMPLETED SUCCESSFULLY!");
    console.log("All catalog, admin, users, settings, and cards are intact.");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Restoration failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase();
