/**
 * HOMEMART4U — MASTER DATABASE RESET & IDEMPOTENT SEED SCRIPT
 * 
 * Target Database: Verified PostgreSQL (Supabase / Render)
 * Final State:
 *  - Exactly ONE administrator account (mobile 7022461700, role ADMIN)
 *  - No SUPER_ADMIN or super-admin concept
 *  - Exactly TWO sample products (Fresh Chicken — 1 kg, Farm Eggs — Sample Pack)
 *  - Exactly TWO sample coupons (WELCOME10, SAVE50)
 *  - Exactly ZERO customer accounts
 *  - Exactly ZERO delivery-agent accounts
 *  - Exactly ZERO historical orders or transactions
 *  - Exactly ZERO obsolete logs or temporary records
 *  - Preserved SystemSettings and _prisma_migrations
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DIRECT_URL,
    },
  },
});

async function main() {
  console.log("=================================================");
  console.log("HOMEMART4U CONTROLLED DATABASE RESET & SEED");
  console.log("=================================================");

  // 1. Production Safeguard Confirmation Check
  const isProduction = process.env.NODE_ENV === "production";
  const hasConfirmation =
    process.env.RESET_CONFIRM === "YES" ||
    process.argv.includes("--confirm") ||
    process.argv.includes("--force");

  if (isProduction && !hasConfirmation) {
    console.error("\n[SAFETY ABORT] Execution halted: Target is marked as PRODUCTION.");
    console.error("To execute a destructive reset on production, explicit operator confirmation is required:");
    console.error("  Run with: RESET_CONFIRM=YES node backend/scripts/controlled-reset.cjs --confirm\n");
    process.exit(1);
  }

  // 2. Validate Required Environment Credentials
  const adminMobile = process.env.ADMIN_MOBILE || "7022461700";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@homemart4u.in";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword && !isProduction) {
    console.warn("[WARN] ADMIN_PASSWORD not found in environment; using secure fallback for local dev.");
  } else if (!adminPassword && isProduction) {
    console.error("[SAFETY ABORT] ADMIN_PASSWORD must be configured in environment for production reset.");
    process.exit(1);
  }
  const effectivePassword = adminPassword || "Admin@HomeMart4U#2026!";

  // 3. Ensure Shared Rate-Limit Table exists
  console.log("[1/6] Verifying shared infrastructure tables...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_RateLimit" (
      "key" VARCHAR(255) PRIMARY KEY,
      "count" INT NOT NULL DEFAULT 1,
      "resetAt" TIMESTAMP NOT NULL
    );
  `);

  // 4. Controlled Transaction / Reverse Dependency Cleanup
  console.log("[2/6] Executing reverse-dependency database cleanup...");
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "WhatsAppMessage",
      "PaymentWebhookEvent",
      "PaymentAttempt",
      "BankTransaction",
      "DeliveryCollection",
      "DeliveryAssignment",
      "Review",
      "CouponRedemption",
      "Payment",
      "OrderItem",
      "Order",
      "NotificationBroadcast",
      "NotificationSubscription",
      "AuditLog",
      "Favorite",
      "CustomizationOption",
      "CustomizationGroup",
      "ProductVariant",
      "Product",
      "Category",
      "Coupon",
      "OfferContent"
    CASCADE;
  `);

  // 5. Clean Non-Admin Users and ensure exactly 1 Admin
  console.log("[3/6] Purging non-admin users and standardizing sole ADMIN account...");
  await prisma.$executeRawUnsafe(`
    DELETE FROM "Address" WHERE "userId" IN (SELECT id FROM "User" WHERE mobile != $1);
  `, adminMobile);

  await prisma.$executeRawUnsafe(`
    DELETE FROM "DeliveryAgentProfile" WHERE "userId" IN (SELECT id FROM "User" WHERE mobile != $1);
  `, adminMobile);

  await prisma.$executeRawUnsafe(`
    DELETE FROM "User" WHERE mobile != $1;
  `, adminMobile);

  // Upsert the sole ADMIN account securely
  const passwordHash = await bcrypt.hash(effectivePassword, 10);
  await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      email: adminEmail,
      name: "Admin (HomeMart4U)",
      passwordHash: passwordHash,
    },
    create: {
      name: "Admin (HomeMart4U)",
      mobile: adminMobile,
      email: adminEmail,
      passwordHash: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // 6. Seed System Settings (Preserve / Idempotent Upsert 21 settings)
  console.log("[4/6] Seeding system settings...");
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

  // 7. Seed Categories (2 Active Meat & Egg Categories, 2 Coming Soon)
  console.log("[5/6] Seeding meat and egg categories...");
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

  // Decommissioned grocery categories preserved for historical compliance reference:
  // - dairy-eggs-bread, atta-rice-dal, spices-masalas (omitted from active database)

  // 8. Seed EXACTLY TWO Sample Products
  console.log("[6/6] Seeding exactly 2 sample products, 2 coupons & 2 promotional cards...");

  // Sample Product 1: Fresh Chicken — 1 kg
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
            priceMinor: 24000, // ₹240.00
            mrpMinor: 29500,   // ₹295.00
            isAvailable: true,
          },
          {
            name: "500g",
            pricingType: "WEIGHT",
            quantityValue: 500,
            quantityUnit: "g",
            priceMinor: 13000, // ₹130.00
            mrpMinor: 16000,   // ₹160.00
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

  // Sample Product 2: Farm Eggs — Sample Pack
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
            priceMinor: 7500, // ₹75.00
            mrpMinor: 9000,   // ₹90.00
            isAvailable: true,
          },
          {
            name: "Pack of 12",
            pricingType: "PIECE",
            quantityValue: 12,
            quantityUnit: "pc",
            priceMinor: 14500, // ₹145.00
            mrpMinor: 17500,   // ₹175.00
            isAvailable: true,
          },
        ],
      },
    },
  });

  // Seed EXACTLY TWO Sample Coupons
  const now = new Date();
  const future = new Date("2028-12-31T23:59:59Z");

  // Coupon 1: WELCOME10 (10% OFF, min order ₹299, max discount ₹100)
  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      minimumOrderMinor: 29900, // ₹299.00
      maximumDiscountMinor: 10000, // ₹100.00 max discount
      freeDelivery: false,
      startsAt: now,
      expiresAt: future,
      isActive: true,
      perUserLimit: 1,
    },
  });

  // Coupon 2: SAVE50 (₹50 fixed discount, min order ₹199)
  await prisma.coupon.create({
    data: {
      code: "SAVE50",
      type: "FIXED",
      value: 50,
      minimumOrderMinor: 19900, // ₹199.00
      maximumDiscountMinor: 5000, // ₹50.00
      freeDelivery: false,
      startsAt: now,
      expiresAt: future,
      isActive: true,
      perUserLimit: 3,
    },
  });

  // Seed EXACTLY TWO Sample Promotional Cards
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

  // 9. Strict Post-Reset Counts Verification
  const userCount = await prisma.user.count();
  const adminUsers = await prisma.user.findMany({ select: { mobile: true, role: true, status: true } });
  const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  const customerCount = await prisma.user.count({ where: { role: "CUSTOMER" } });
  const agentCount = await prisma.user.count({ where: { role: "DELIVERY_AGENT" } });
  const productCount = await prisma.product.count({ where: { isActive: true } });
  const couponCount = await prisma.coupon.count({ where: { isActive: true } });
  const orderCount = await prisma.order.count();
  const paymentCount = await prisma.payment.count();
  const auditLogCount = await prisma.auditLog.count();

  console.log("\n=================================================");
  console.log("FINAL DATABASE VERIFICATION REPORT");
  console.log("=================================================");
  console.log(`Total Users (expected: 1):                 ${userCount}`);
  console.log(`Admin Accounts (expected: 1):              ${adminUsers.length} [role: ${adminUsers[0]?.role}]`);
  console.log(`SUPER_ADMIN Accounts (expected: 0):        ${superAdminCount}`);
  console.log(`Customer Accounts (expected: 0):           ${customerCount}`);
  console.log(`Delivery Agent Accounts (expected: 0):     ${agentCount}`);
  console.log(`Active Sample Products (expected: 2):       ${productCount}`);
  console.log(`Active Sample Coupons (expected: 2):        ${couponCount}`);
  console.log(`Historical Orders (expected: 0):           ${orderCount}`);
  console.log(`Transactions & Payments (expected: 0):     ${paymentCount}`);
  console.log(`Obsolete Audit Logs (expected: 0):         ${auditLogCount}`);
  console.log("=================================================\n");

  let hasDiscrepancy = false;
  if (userCount !== 1 || adminUsers[0]?.role !== "ADMIN") {
    console.error("FAIL: Expected exactly 1 user with role ADMIN.");
    hasDiscrepancy = true;
  }
  if (superAdminCount !== 0) {
    console.error("FAIL: SUPER_ADMIN role must not exist.");
    hasDiscrepancy = true;
  }
  if (productCount !== 2) {
    console.error(`FAIL: Expected exactly 2 active sample products, found ${productCount}.`);
    hasDiscrepancy = true;
  }
  if (couponCount !== 2) {
    console.error(`FAIL: Expected exactly 2 active sample coupons, found ${couponCount}.`);
    hasDiscrepancy = true;
  }
  if (orderCount !== 0 || paymentCount !== 0 || customerCount !== 0 || agentCount !== 0) {
    console.error("FAIL: Historical accounts, orders, or transactions were not fully purged.");
    hasDiscrepancy = true;
  }

  if (hasDiscrepancy) {
    console.error("Database reset verification FAILED. Aborting with exit code 1.");
    process.exit(1);
  }

  console.log("SUCCESS: Controlled database reset and seed verified successfully.\n");
}

main()
  .catch((err) => {
    console.error("FATAL ERROR during controlled database reset:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

