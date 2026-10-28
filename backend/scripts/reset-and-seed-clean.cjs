const dns = require("dns").promises;
const { PrismaClient } = require("@prisma/client");

async function getIpv4DatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL || "postgresql://postgres.avkxvzkkuwjltumzfoqm:homemart4u%400071@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";
  try {
    const urlObj = new URL(rawUrl.replace("postgresql://", "http://"));
    const hostname = urlObj.hostname;
    
    // Resolve to IPv4 specifically
    const lookup = await dns.lookup(hostname, { family: 4 });
    console.log(`Resolved ${hostname} -> IPv4 ${lookup.address}`);
    
    // Replace hostname with IPv4 in the connection string
    let finalUrl = rawUrl.replace(hostname, lookup.address);
    if (!finalUrl.includes("sslmode=require")) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "sslmode=require";
    }
    return finalUrl;
  } catch (err) {
    console.warn("DNS IPv4 lookup fallback:", err.message);
    return "postgresql://postgres.avkxvzkkuwjltumzfoqm:homemart4u%400071@3.111.105.85:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";
  }
}

async function main() {
  const dbUrl = await getIpv4DatabaseUrl();
  console.log("Connecting to PostgreSQL...");
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    console.log("Starting full database purge and clean reset...");

    // 1. Purge all operational logs, messages, transactions, and orders atomically
    console.log("Purging all orders, payments, logs, and messages via atomic TRUNCATE...");
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

    // 2. Delete non-admin users (preserve SUPER_ADMIN and ADMIN users)
    console.log("Cleaning non-admin users...");
    await prisma.$executeRawUnsafe(`DELETE FROM "Address" WHERE "userId" IN (SELECT id FROM "User" WHERE role NOT IN ('ADMIN', 'SUPER_ADMIN') AND mobile NOT IN ('9844797374', '7022461700'))`);
    await prisma.$executeRawUnsafe(`DELETE FROM "DeliveryAgentProfile" WHERE "userId" IN (SELECT id FROM "User" WHERE role NOT IN ('ADMIN', 'SUPER_ADMIN') AND mobile NOT IN ('9844797374', '7022461700'))`);
    await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE role NOT IN ('ADMIN', 'SUPER_ADMIN') AND mobile NOT IN ('9844797374', '7022461700')`);

    // Ensure default admin user 9844797374 exists and has SUPER_ADMIN role
    const existingOwner = await prisma.user.findUnique({ where: { mobile: "9844797374" } });
    if (existingOwner) {
      await prisma.user.update({
        where: { mobile: "9844797374" },
        data: { role: "SUPER_ADMIN", status: "ACTIVE" },
      });
      console.log("Verified Syed (9844797374) as SUPER_ADMIN.");
    }

    // Ensure admin user 7022461700 exists and has ADMIN role
    const existingAdmin = await prisma.user.findUnique({ where: { mobile: "7022461700" } });
    if (existingAdmin) {
      await prisma.user.update({
        where: { mobile: "7022461700" },
        data: { role: "ADMIN", status: "ACTIVE" },
      });
      console.log("Verified Admin (7022461700) as ADMIN.");
    }

    // 4. Seed EXACTLY 2 Categories (+ 2 coming-soon meat categories)
    console.log("Seeding categories...");
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
        slug: "mutton",
        department: "MEAT",
        description: "Premium tender pasture-raised mutton - Coming Soon",
        imageUrl: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80",
        isActive: false,
        isComingSoon: true,
        displayOrder: 3,
      },
    });

    await prisma.category.create({
      data: {
        name: "Fish & Seafood",
        slug: "fish",
        department: "MEAT",
        description: "Cleaned and fresh water catch - Coming Soon",
        imageUrl: "https://images.unsplash.com/photo-1534940381676-e578c2e01df3?auto=format&fit=crop&w=600&q=80",
        isActive: false,
        isComingSoon: true,
        displayOrder: 4,
      },
    });

    // 5. Seed EXACTLY 2 Sample Products
    console.log("Seeding exactly 2 sample products...");

    // Product 1: Fresh Chicken Curry Cut
    const chickenProduct = await prisma.product.create({
      data: {
        name: "Fresh Chicken Curry Cut",
        slug: "fresh-chicken-curry-cut",
        categoryId: chickenCat.id,
        description: "Tender, succulent chicken cuts including drumstick, breast, and wing pieces. Sourced fresh every morning and 100% Halal certified.",
        productType: "WEIGHT",
        foodType: "NON_VEG",
        isHalal: true,
        isActive: true,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
        seoTitle: "Fresh Chicken Curry Cut | HomeMart4U Mulbagal",
        seoDescription: "Order Fresh Chicken Curry Cut in Mulbagal. Delivered fast in 30 minutes.",
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
                  { name: "Large Cut / Biryani Cut", priceDeltaMinor: 0, displayOrder: 3, isActive: true },
                ],
              },
            },
          ],
        },
      },
    });

    // Product 2: Pure Country Desi Nati Eggs
    const eggProduct = await prisma.product.create({
      data: {
        name: "Pure Country Desi Nati Eggs",
        slug: "pure-country-desi-nati-eggs",
        categoryId: eggsCat.id,
        description: "Naturally laid country desi nati brown eggs. Rich yellow yolk packed with authentic nutrition, protein, and natural taste.",
        productType: "PIECE",
        foodType: "EGG",
        isHalal: true,
        isActive: true,
        isAvailable: true,
        imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80",
        seoTitle: "Country Desi Nati Eggs | HomeMart4U Mulbagal",
        seoDescription: "Order Pure Country Desi Nati Eggs in Mulbagal. 100% natural and farm fresh.",
        mrpMinor: 9000,
        savePriceText: "Save ₹15",
        badgeText: "High Protein • Free Range",
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

    console.log(`Created products: "${chickenProduct.name}" and "${eggProduct.name}"`);

    // 6. Seed EXACTLY 2 Sample Promotional Offers (OfferContent)
    console.log("Seeding exactly 2 sample promotional carousel cards...");
    const offer1 = await prisma.offerContent.create({
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

    const offer2 = await prisma.offerContent.create({
      data: {
        title: "Get ₹100 OFF Your First Order",
        description: "Use coupon WELCOME100 at checkout for instant ₹100 off on fresh chicken and desi eggs.",
        type: "OFFER",
        imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=1200&q=80",
        ctaLabel: "Use WELCOME100",
        ctaUrl: "/categories/fresh-chicken",
        couponCode: "WELCOME100",
        status: "PUBLISHED",
        priority: 2,
      },
    });

    console.log(`Created offers: "${offer1.title}" and "${offer2.title}"`);

    // 7. Seed EXACTLY 2 Sample Coupons
    console.log("Seeding exactly 2 sample coupons...");
    const now = new Date();
    const future = new Date("2028-12-31T23:59:59Z");

    const coupon1 = await prisma.coupon.create({
      data: {
        code: "WELCOME100",
        type: "MIN_ORDER_FIXED",
        value: 100,
        minimumOrderMinor: 29900, // ₹299 min order
        maximumDiscountMinor: 10000,
        freeDelivery: false,
        startsAt: now,
        expiresAt: future,
        isActive: true,
        perUserLimit: 1,
      },
    });

    const coupon2 = await prisma.coupon.create({
      data: {
        code: "FRESH50",
        type: "FIXED",
        value: 50,
        minimumOrderMinor: 19900, // ₹199 min order
        maximumDiscountMinor: 5000,
        freeDelivery: false,
        startsAt: now,
        expiresAt: future,
        isActive: true,
        perUserLimit: 3,
      },
    });

    console.log(`Created coupons: "${coupon1.code}" and "${coupon2.code}"`);

    // Summary check
    const productCount = await prisma.product.count();
    const offerCount = await prisma.offerContent.count();
    const couponCount = await prisma.coupon.count();
    const orderCount = await prisma.order.count();
    const logCount = await prisma.auditLog.count();
    const adminUsers = await prisma.user.findMany({ select: { name: true, mobile: true, role: true } });

    console.log("\n============================================");
    console.log("DATABASE PURGE & 2-SAMPLE SEED COMPLETE");
    console.log("============================================");
    console.log(`Active Products (expected: 2): ${productCount}`);
    console.log(`Active Offers (expected: 2): ${offerCount}`);
    console.log(`Active Coupons (expected: 2): ${couponCount}`);
    console.log(`Remaining Orders (expected: 0): ${orderCount}`);
    console.log(`Remaining Audit Logs (expected: 0): ${logCount}`);
    console.log(`Admin Accounts Preserved:`);
    console.log(JSON.stringify(adminUsers, null, 2));
    console.log("============================================\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN RESET:", err);
  process.exit(1);
});
