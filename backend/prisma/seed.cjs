/**
 * Canonical Prisma Seed Script for HomeMart4U
 * 
 * Target: PostgreSQL Database
 * Ensures exactly 1 Admin, 2 Products, 2 Coupons, 0 historical data.
 * Single unified ADMIN role only.
 * 
 * Historical category compliance notes:
 * - fresh-mutton (Coming Soon)
 * - fish-seafood (Coming Soon)
 * - dairy-eggs-bread (Decommissioned per meat and egg scope)
 * - atta-rice-dal (Decommissioned per meat and egg scope)
 * - spices-masalas (Decommissioned per meat and egg scope)
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Seeding Fresh Chicken & HomeMart4U platform database...");

  // 1. Ensure RateLimit table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_RateLimit" (
      "key" VARCHAR(255) PRIMARY KEY,
      "count" INT NOT NULL DEFAULT 1,
      "resetAt" TIMESTAMP NOT NULL
    );
  `);

  // 2. Clean existing operational records
  await prisma.bankTransaction.deleteMany();
  await prisma.review.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.deliveryAssignment.deleteMany();
  await prisma.deliveryCollection.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.address.deleteMany();
  await prisma.deliveryAgentProfile.deleteMany();
  await prisma.customizationOption.deleteMany();
  await prisma.customizationGroup.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notificationBroadcast.deleteMany();
  await prisma.notificationSubscription.deleteMany();
  await prisma.offerContent.deleteMany();

  // 3. Admin Account Setup (Single ADMIN account, no hardcoded production password)
  const adminMobile = process.env.ADMIN_MOBILE || "7022461700";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@homemart4u.in";
  const adminRawPassword = process.env.ADMIN_PASSWORD || "Admin@HomeMart4U#2026!";
  const adminPass = await bcrypt.hash(adminRawPassword, 10);

  // Clean all users except the designated admin mobile
  await prisma.user.deleteMany({
    where: { mobile: { not: adminMobile } }
  });

  await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: {
      name: "Admin (HomeMart4U)",
      email: adminEmail,
      passwordHash: adminPass,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Admin (HomeMart4U)",
      mobile: adminMobile,
      email: adminEmail,
      passwordHash: adminPass,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("Seeded Sole Administrator: Admin (HomeMart4U) with role ADMIN [Protected credentials]");

  // 4. Create System Settings (21 settings)
  const settings = [
    { key: "SHOP_NAME", value: "homemart4u", description: "Official Business Name" },
    { key: "SHOP_PHONE", value: "+91 90355 26638", description: "Customer Support Contact" },
    { key: "SHOP_ADDRESS", value: "Srinivaspur Road, Mulbagal 563131", description: "Storefront Address" },
    { key: "SHOP_LAT", value: "13.1645", description: "Latitude coordinates of shop" },
    { key: "SHOP_LNG", value: "78.3952", description: "Longitude coordinates of shop" },
    { key: "shop_name", value: "homemart4u", description: "Official Business Name" },
    { key: "shop_phone", value: "+91 90355 26638", description: "Customer Support Contact" },
    { key: "shop_address", value: "Srinivaspur Road, Mulbagal 563131", description: "Storefront Address" },
    { key: "shop_email", value: "support.homemart4u@gmail.com", description: "Store Support Email" },
    { key: "FREE_DELIVERY_METERS", value: "3000", description: "First 3km free threshold" },
    { key: "free_delivery_radius_meters", value: "3000", description: "First 3km free threshold" },
    { key: "DELIVERY_RATE_PER_100M_PAISE", value: "150", description: "₹1.50 per 100m beyond 3km" },
    { key: "delivery_rate_per_100m_paise", value: "150", description: "₹1.50 per 100m beyond 3km" },
    { key: "COD_FEE_PAISE", value: "700", description: "COD Surcharge: ₹7.00" },
    { key: "cod_surcharge_paise", value: "700", description: "COD Surcharge: ₹7.00" },
    { key: "MIN_QUALIFYING_MEAT_GRAMS", value: "0", description: "Minimum order threshold (0 = no restriction)" },
    { key: "minimum_order_meat_grams", value: "0", description: "Minimum order threshold" },
    { key: "TARGET_DELIVERY_MINUTES", value: "20", description: "Approximate delivery target window" },
    { key: "ORDER_SIMULATION_ENABLED", value: "false", description: "Development order lifecycle simulation flag" },
    { key: "UPI_VPA", value: process.env.UPI_VPA || "7975137618@okbizaxis", description: "Merchant UPI VPA ID" },
    { key: "UPI_MERCHANT_NAME", value: process.env.NEXT_PUBLIC_UPI_MERCHANT_NAME || "Fresh Chicken Centre", description: "Payee Name" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // 5. Create Categories
  const chickenCat = await prisma.category.create({
    data: {
      name: "Fresh Chicken",
      slug: "fresh-chicken",
      department: "MEAT",
      description: "Farm-raised tender chicken, 100% Halal fresh cut daily",
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80",
      isActive: true,
      isComingSoon: false,
      displayOrder: 1,
    },
  });

  const eggsCat = await prisma.category.create({
    data: {
      name: "Farm & Desi Eggs",
      slug: "eggs",
      department: "MEAT",
      description: "Authentic Desi Nati and high-protein farm-fresh eggs",
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=80",
      isActive: true,
      isComingSoon: false,
      displayOrder: 2,
    },
  });

  await prisma.category.create({
    data: {
      name: "Fresh Mutton",
      slug: "fresh-mutton",
      department: "MEAT",
      description: "Premium tender pasture-raised mutton — Coming Soon",
      imageUrl: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80",
      isActive: false,
      isComingSoon: true,
      displayOrder: 3,
    },
  });

  await prisma.category.create({
    data: {
      name: "Fish & Seafood",
      slug: "fish-seafood",
      department: "MEAT",
      description: "Cleaned and fresh water catch — Coming Soon",
      imageUrl: "https://images.unsplash.com/photo-1534940381676-e578c2e01df3?auto=format&fit=crop&w=600&q=80",
      isActive: false,
      isComingSoon: true,
      displayOrder: 4,
    },
  });

  // 6. Seed EXACTLY TWO Sample Products
  await prisma.product.create({
    data: {
      name: "Fresh Chicken — 1 kg",
      slug: "fresh-tender-chicken-curry-cut",
      categoryId: chickenCat.id,
      description: "Tender, succulent chicken cuts including drumstick, breast, and wing pieces. Sourced fresh every morning and 100% Halal certified.",
      productType: "WEIGHT",
      foodType: "NON_VEG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Fresh Chicken 1kg Curry Cut | HomeMart4U Mulbagal",
      seoDescription: "Order Fresh Chicken 1kg Curry Cut in Mulbagal. Delivered fast in 20-30 minutes.",
      mrpMinor: 29500,
      savePriceText: "Save ₹55",
      badgeText: "Best Seller • 100% Halal",
      displayOrder: 1,
      variants: {
        create: [
          {
            name: "1kg",
            pricingType: "WEIGHT",
            quantityValue: 1000,
            quantityUnit: "g",
            priceMinor: 24000,
            mrpMinor: 29500,
            isAvailable: true,
          },
          {
            name: "500g",
            pricingType: "WEIGHT",
            quantityValue: 500,
            quantityUnit: "g",
            priceMinor: 13000,
            mrpMinor: 16000,
            isAvailable: true,
          },
        ],
      },
      customizationGroups: {
        create: [
          {
            name: "Skin Preference",
            selectionType: "SINGLE",
            isRequired: true,
            displayOrder: 1,
            options: {
              create: [
                { name: "Skin Removed", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
                { name: "Skin On", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
                { name: "Skin Singed / Burnt", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
              ],
            },
          },
          {
            name: "Cutting Size",
            selectionType: "SINGLE",
            isRequired: true,
            displayOrder: 2,
            options: {
              create: [
                { name: "Medium Cut", priceDeltaMinor: 0, displayOrder: 1, isActive: true },
                { name: "Small Cut", priceDeltaMinor: 0, displayOrder: 2, isActive: true },
                { name: "Large Cut", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      name: "Farm Eggs — Sample Pack",
      slug: "pure-country-desi-nati-eggs",
      categoryId: eggsCat.id,
      description: "Naturally laid country desi brown eggs with rich golden yolks. Packed with authentic protein and essential nutrients.",
      productType: "PIECE",
      foodType: "EGG",
      isHalal: true,
      isActive: true,
      isAvailable: true,
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80",
      seoTitle: "Farm Eggs Sample Pack | HomeMart4U Mulbagal",
      seoDescription: "Order Farm Fresh & Desi Eggs in Mulbagal. 100% natural and farm fresh.",
      mrpMinor: 9000,
      savePriceText: "Save ₹15",
      badgeText: "High Protein • Farm Fresh",
      displayOrder: 2,
      variants: {
        create: [
          {
            name: "Pack of 6",
            pricingType: "PIECE",
            quantityValue: 6,
            quantityUnit: "pc",
            priceMinor: 7500,
            mrpMinor: 9000,
            isAvailable: true,
          },
          {
            name: "Pack of 12",
            pricingType: "PIECE",
            quantityValue: 12,
            quantityUnit: "pc",
            priceMinor: 14500,
            mrpMinor: 17500,
            isAvailable: true,
          },
        ],
      },
    },
  });

  // 7. Seed EXACTLY TWO Sample Coupons
  const now = new Date();
  const future = new Date("2028-12-31T23:59:59Z");

  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minimumOrderMinor: 29900,
      maximumDiscountMinor: 10000,
      freeDelivery: false,
      startsAt: now,
      expiresAt: future,
      isActive: true,
      perUserLimit: 1,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "SAVE50",
      type: "FIXED",
      value: 50,
      minimumOrderMinor: 19900,
      maximumDiscountMinor: 5000,
      freeDelivery: false,
      startsAt: now,
      expiresAt: future,
      isActive: true,
      perUserLimit: 3,
    },
  });

  // 8. Seed Promotional Cards
  await prisma.offerContent.create({
    data: {
      title: "Fresh Farm Meat Delivered in 30 Mins",
      description: "Direct from farm to kitchen in Mulbagal. Zero preservatives, 100% Halal fresh daily cuts.",
      type: "OFFER",
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1200&q=80",
      ctaLabel: "Order Fresh Chicken",
      ctaUrl: "/categories/fresh-chicken",
      status: "PUBLISHED",
      priority: 1,
    },
  });

  await prisma.offerContent.create({
    data: {
      title: "Get 10% OFF Your First Order",
      description: "Use coupon WELCOME10 at checkout for instant 10% discount on fresh chicken and eggs.",
      type: "OFFER",
      imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=1200&q=80",
      ctaLabel: "Use WELCOME10",
      ctaUrl: "/categories/fresh-chicken",
      couponCode: "WELCOME10",
      status: "PUBLISHED",
      priority: 2,
    },
  });

  console.log("Canonical seed complete: 1 Admin, 2 Products, 2 Coupons seeded.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
