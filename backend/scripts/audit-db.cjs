const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function audit() {
  try {
    const counts = {
      users: await prisma.user.count(),
      usersByRole: await prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      addresses: await prisma.address.count(),
      categories: await prisma.category.count(),
      products: await prisma.product.count(),
      productVariants: await prisma.productVariant.count(),
      customizationGroups: await prisma.customizationGroup.count(),
      customizationOptions: await prisma.customizationOption.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      payments: await prisma.payment.count(),
      bankTransactions: await prisma.bankTransaction.count(),
      paymentAttempts: await prisma.paymentAttempt.count(),
      paymentWebhookEvents: await prisma.paymentWebhookEvent.count(),
      deliveryCollections: await prisma.deliveryCollection.count(),
      deliveryAssignments: await prisma.deliveryAssignment.count(),
      deliveryAgentProfiles: await prisma.deliveryAgentProfile.count(),
      coupons: await prisma.coupon.count(),
      couponRedemptions: await prisma.couponRedemption.count(),
      reviews: await prisma.review.count(),
      favorites: await prisma.favorite.count(),
      notificationSubscriptions: await prisma.notificationSubscription.count(),
      notificationBroadcasts: await prisma.notificationBroadcast.count(),
      auditLogs: await prisma.auditLog.count(),
      systemSettings: await prisma.systemSetting.count(),
      whatsAppMessages: await prisma.whatsAppMessage.count(),
      offerContents: await prisma.offerContent.count()
    };
    console.log("RECORD_COUNTS_BEGIN");
    console.log(JSON.stringify(counts, null, 2));
    console.log("RECORD_COUNTS_END");

    const users = await prisma.user.findMany({
      select: { id: true, mobile: true, email: true, role: true, status: true, name: true }
    });
    console.log("USERS_BEGIN");
    console.log(JSON.stringify(users, null, 2));
    console.log("USERS_END");

    const products = await prisma.product.findMany({
      select: { id: true, name: true, slug: true, isActive: true, isAvailable: true }
    });
    console.log("PRODUCTS_BEGIN");
    console.log(JSON.stringify(products, null, 2));
    console.log("PRODUCTS_END");

    const coupons = await prisma.coupon.findMany({
      select: { id: true, code: true, type: true, value: true, isActive: true }
    });
    console.log("COUPONS_BEGIN");
    console.log(JSON.stringify(coupons, null, 2));
    console.log("COUPONS_END");

    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, isActive: true, isComingSoon: true }
    });
    console.log("CATEGORIES_BEGIN");
    console.log(JSON.stringify(categories, null, 2));
    console.log("CATEGORIES_END");

  } catch (e) {
    console.error("Audit error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

audit();

