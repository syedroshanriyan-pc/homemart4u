/**
 * Homemart4u Database Restore Utility
 * Restores all exported data from `data-backup.json` into a target PostgreSQL database.
 * 
 * Usage:
 *   node backend/prisma/restore-database.cjs
 * Or with custom connection string:
 *   DATABASE_URL="postgresql://..." node backend/prisma/restore-database.cjs
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require(path.resolve(__dirname, "../../node_modules/@prisma/client"));

const targetDbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

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
    const userMap = new Map();
    for (const u of data.users) {
      const savedUser = await prisma.user.upsert({
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
      userMap.set(u.id, savedUser.id);
      console.log(`  - User: ${savedUser.name} (${savedUser.role}) [${savedUser.id}]`);
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

    // 4. Product Variants
    console.log(`\n4. Restoring ${data.variants.length} Product Variants...`);
    for (const v of data.variants) {
      const targetProductId = productMap.get(v.productId) || v.productId;
      const existing = await prisma.productVariant.findFirst({
        where: { productId: targetProductId, name: v.name },
      });

      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
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
            productId: targetProductId,
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
    console.log(`  - Restored all ${data.variants.length} variants`);

    // 5. Customization Groups & Options
    console.log(`\n5. Restoring ${data.customizationGroups.length} Customization Groups...`);
    const groupMap = new Map();
    for (const cg of data.customizationGroups) {
      const targetProductId = productMap.get(cg.productId) || cg.productId;
      const existing = await prisma.customizationGroup.findFirst({
        where: { productId: targetProductId, name: cg.name },
      });

      let savedGroupId = null;
      if (existing) {
        const updated = await prisma.customizationGroup.update({
          where: { id: existing.id },
          data: {
            selectionType: cg.selectionType,
            isRequired: cg.isRequired,
            displayOrder: cg.displayOrder,
          },
        });
        savedGroupId = updated.id;
      } else {
        const created = await prisma.customizationGroup.create({
          data: {
            productId: targetProductId,
            name: cg.name,
            selectionType: cg.selectionType,
            isRequired: cg.isRequired,
            displayOrder: cg.displayOrder,
          },
        });
        savedGroupId = created.id;
      }
      groupMap.set(cg.id, savedGroupId);
    }

    console.log(`\n6. Restoring ${data.customizationOptions.length} Customization Options...`);
    for (const co of data.customizationOptions) {
      const targetGroupId = groupMap.get(co.groupId) || co.groupId;
      const existing = await prisma.customizationOption.findFirst({
        where: { groupId: targetGroupId, name: co.name },
      });

      if (existing) {
        await prisma.customizationOption.update({
          where: { id: existing.id },
          data: {
            priceDeltaMinor: co.priceDeltaMinor,
            isActive: co.isActive,
            displayOrder: co.displayOrder,
          },
        });
      } else {
        await prisma.customizationOption.create({
          data: {
            groupId: targetGroupId,
            name: co.name,
            priceDeltaMinor: co.priceDeltaMinor,
            isActive: co.isActive,
            displayOrder: co.displayOrder,
          },
        });
      }
    }
    console.log(`  - Restored all ${data.customizationOptions.length} customization options`);

    // 7. Coupons
    console.log(`\n7. Restoring ${data.coupons.length} Coupons...`);
    for (const cp of data.coupons) {
      await prisma.coupon.upsert({
        where: { code: cp.code },
        create: {
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
        },
        update: {
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
        },
      });
      console.log(`  - Coupon: ${cp.code} (${cp.type})`);
    }

    // 8. Offers & Promotional Cards
    console.log(`\n8. Restoring ${data.offers.length} Promotional Cards & Offers...`);
    for (const off of data.offers) {
      await prisma.offerContent.upsert({
        where: { id: off.id },
        create: {
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
        },
        update: {
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
        },
      });
      console.log(`  - Offer/Card: ${off.title} (${off.status})`);
    }

    // 9. System Settings
    console.log(`\n9. Restoring ${data.systemSettings.length} System Settings...`);
    for (const ss of data.systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: ss.key },
        create: {
          key: ss.key,
          value: ss.value,
          description: ss.description,
        },
        update: {
          value: ss.value,
          description: ss.description,
        },
      });
    }
    console.log(`  - Restored all ${data.systemSettings.length} system settings`);

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
