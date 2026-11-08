/**
 * Homemart4u Database Export Snapshot
 * Exports all administrative data, users, categories, products, variants,
 * customizations, coupons, promotional cards, and system settings.
 * Strictly excludes transactional data (orders, order items, payments,
 * delivery assignments, reviews, audit logs, whatsapp logs, user activity logs).
 */

const fs = require("fs");
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

async function exportDatabase() {
  console.log("Starting Homemart4u database snapshot export...");

  try {
    // 1. Users (Admin, customers, delivery agents)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        role: true,
        name: true,
        mobile: true,
        email: true,
        passwordHash: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 2. Addresses
    const addresses = await prisma.address.findMany();

    // 3. Delivery Agent Profiles
    const deliveryProfiles = await prisma.deliveryAgentProfile.findMany();

    // 4. Categories (Root categories first, then subcategories)
    const categories = await prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { displayOrder: "asc" }],
    });

    // 5. Products
    const products = await prisma.product.findMany({
      orderBy: { displayOrder: "asc" },
    });

    // 6. Product Variants
    const variants = await prisma.productVariant.findMany({
      orderBy: { priceMinor: "asc" },
    });

    // 7. Customization Groups
    const customizationGroups = await prisma.customizationGroup.findMany({
      orderBy: { displayOrder: "asc" },
    });

    // 8. Customization Options
    const customizationOptions = await prisma.customizationOption.findMany({
      orderBy: { displayOrder: "asc" },
    });

    // 9. Coupons
    const coupons = await prisma.coupon.findMany();

    // 10. Offers & Promotional Cards
    const offers = await prisma.offerContent.findMany({
      orderBy: { priority: "desc" },
    });

    // 11. System Settings
    const systemSettings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    // 12. Uploaded Media
    const uploadedMedia = await prisma.uploadedMedia.findMany();

    const snapshot = {
      exportedAt: new Date().toISOString(),
      sourceDatabase: "Supabase PostgreSQL aws-0-ap-south-1",
      counts: {
        users: users.length,
        addresses: addresses.length,
        deliveryProfiles: deliveryProfiles.length,
        categories: categories.length,
        products: products.length,
        variants: variants.length,
        customizationGroups: customizationGroups.length,
        customizationOptions: customizationOptions.length,
        coupons: coupons.length,
        offers: offers.length,
        systemSettings: systemSettings.length,
        uploadedMedia: uploadedMedia.length,
      },
      data: {
        users,
        addresses,
        deliveryProfiles,
        categories,
        products,
        variants,
        customizationGroups,
        customizationOptions,
        coupons,
        offers,
        systemSettings,
        uploadedMedia,
      },
    };

    const outputPath = path.resolve(__dirname, "data-backup.json");
    fs.writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), "utf-8");

    console.log(`Database snapshot exported successfully to: ${outputPath}`);
    console.log("Summary of exported entities:", snapshot.counts);

    return snapshot;
  } catch (error) {
    console.error("Database export failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();

