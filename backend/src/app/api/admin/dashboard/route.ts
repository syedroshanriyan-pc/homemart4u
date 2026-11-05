import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Orders today (all non-cancelled orders)
    const ordersToday = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday },
      },
      select: {
        id: true,
        orderNumber: true,
        totalMinor: true,
        status: true,
        placedAt: true,
        payment: { select: { method: true, status: true, amountMinor: true } },
      },
    });

    const activeTodayOrders = ordersToday.filter((o) => o.status !== "CANCELLED");
    const todayOrderCount = activeTodayOrders.length;
    const todaySalesMinor = activeTodayOrders.reduce((sum, o) => sum + o.totalMinor, 0);

    const todayCodOrders = activeTodayOrders.filter((o) => o.payment?.method === "COD");
    const todayCodSalesMinor = todayCodOrders.reduce((sum, o) => sum + o.totalMinor, 0);
    const todayCodOrderCount = todayCodOrders.length;

    const todayOnlineOrders = activeTodayOrders.filter(
      (o) => o.payment?.method !== "COD" && o.payment?.status === "COMPLETED"
    );
    const todayOnlineSalesMinor = todayOnlineOrders.reduce((sum, o) => sum + o.totalMinor, 0);
    const todayOnlineOrderCount = todayOnlineOrders.length;

    const aovMinor = todayOrderCount > 0 ? Math.round(todaySalesMinor / todayOrderCount) : 0;

    // 2. Past 2-day orders
    const past2DaysOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twoDaysAgo },
      },
      include: { payment: true },
    });

    // 3. Status Breakdown for the past 2 days
    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: twoDaysAgo },
      },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      PLACED: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count.id;
    });

    // 4. Operational Alerts
    const unassignedOrders = await prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PREPARING"] },
        deliveryAssignment: null,
        createdAt: { gte: twoDaysAgo },
      },
      include: { user: { select: { name: true, mobile: true } } },
      take: 5,
    });

    // Out of stock products
    const outOfStockProducts = await prisma.product.findMany({
      where: { isAvailable: false, isActive: true },
      select: { id: true, name: true, slug: true, category: { select: { name: true } } },
    });

    // Orders approaching 20-minute delivery target
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const targetAtRiskOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
        placedAt: { lte: fifteenMinutesAgo },
        createdAt: { gte: twoDaysAgo },
      },
      select: { id: true, orderNumber: true, status: true, placedAt: true, totalMinor: true },
      take: 5,
    });

    // Recent orders for dashboard table
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twoDaysAgo },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, mobile: true } },
        items: true,
        payment: true,
        deliveryAssignment: {
          include: { agent: { select: { name: true } } },
        },
      },
    });

    // 5. Persisted doorstep collection metrics from DeliveryCollection
    const collections = await prisma.deliveryCollection.findMany({
      select: {
        amountMinor: true,
        collectionMethod: true,
        verificationStatus: true,
      },
    });

    let cashCollectedMinor = 0;
    let upiManualConfirmedMinor = 0;
    let collectionsRequiringReconciliation = 0;

    collections.forEach((c) => {
      const method = c.collectionMethod?.toUpperCase?.() || "";
      if (method === "CASH") {
        cashCollectedMinor += c.amountMinor;
      } else if (
        method === "UPI" ||
        method === "UPI_MANUAL" ||
        method === "UPI_MANUAL_VERIFIED" ||
        method === "ONLINE_DOORSTEP"
      ) {
        upiManualConfirmedMinor += c.amountMinor;
      }
      if (
        c.verificationStatus === "COLLECTED_PENDING_RECONCILIATION" ||
        c.verificationStatus === "PENDING_RECONCILIATION"
      ) {
        collectionsRequiringReconciliation++;
      }
    });

    const totalCollectionsMinor = cashCollectedMinor + upiManualConfirmedMinor;

    // Outstanding collection: Sum of undelivered & unsettled COD orders
    const pendingCodOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] },
        payment: { status: "PENDING" },
      },
      select: { totalMinor: true },
    });
    const outstandingCollectionMinor = pendingCodOrders.reduce((sum, o) => sum + o.totalMinor, 0);

    const pendingDeliveries =
      (statusMap.PLACED || 0) +
      (statusMap.CONFIRMED || 0) +
      (statusMap.PREPARING || 0) +
      (statusMap.OUT_FOR_DELIVERY || 0);
    const deliveredOrders = statusMap.DELIVERED || 0;
    const failedDeliveries = statusMap.CANCELLED || 0;

    // 6. Comprehensive PostgreSQL Totals & Store Status
    const [
      totalProductsCount,
      activeProductsCount,
      availableProductsCount,
      unavailableProductsCount,
      outOfStockProductsCount,
      totalCategoriesCount,
      activePromotionalCardsCount,
      allTimeOrdersCount,
      pendingOrdersCount,
      completedOrdersCount,
      allTimeSalesData,
      storeStatusRecord,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isAvailable: true, isActive: true } }),
      prisma.product.count({ where: { OR: [{ isAvailable: false }, { isActive: false }] } }),
      prisma.product.count({ where: { isAvailable: false, isActive: true } }),
      prisma.category.count(),
      prisma.offerContent.count({ where: { status: "PUBLISHED" } }),
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"] } },
      }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { totalMinor: true },
      }),
      prisma.systemSetting.findFirst({
        where: { key: { in: ["store_status", "store_open_status", "STORE_OPEN"] } },
      }),
    ]);

    const totalRevenueMinor = allTimeSalesData._sum.totalMinor || 0;
    const store_status =
      storeStatusRecord?.value === "CLOSED" || storeStatusRecord?.value === "false"
        ? "CLOSED"
        : "OPEN";

    return NextResponse.json({
      metrics: {
        todaySalesMinor,
        todayOrderCount,
        todayCodSalesMinor,
        todayOnlineSalesMinor,
        todayCodOrderCount,
        todayOnlineOrderCount,
        aovMinor,
        statusMap,
        totalOrders: past2DaysOrders.length,
        pendingDeliveries,
        deliveredOrders,
        failedDeliveries,
        cashCollectedMinor,
        upiManualConfirmedMinor,
        totalCollectionsMinor,
        outstandingCollectionMinor,
        collectionsRequiringReconciliation,
        past2DaysTotal: past2DaysOrders.length,

        // Real PostgreSQL System Totals
        totalProducts: totalProductsCount,
        activeProducts: activeProductsCount,
        availableProducts: availableProductsCount,
        unavailableProducts: unavailableProductsCount,
        outOfStockProductsCount,
        totalCategories: totalCategoriesCount,
        activePromotionalCards: activePromotionalCardsCount,
        allTimeOrders: allTimeOrdersCount,
        pendingOrders: pendingOrdersCount,
        completedOrders: completedOrdersCount,
        totalRevenueMinor,
        store_status,
        deliveryStatus: {
          pendingDeliveries,
          deliveredOrders,
          failedDeliveries,
        },
      },
      alerts: {
        unassignedOrders,
        outOfStockProducts,
        targetAtRiskOrders,
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
