import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const activeOrderCondition = {
      OR: [
        { payment: { method: "COD" } },
        { payment: { status: "COMPLETED" } },
      ],
    };

    // 1. Orders today (excluding unpaid online checkouts)
    const ordersToday = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday },
        ...activeOrderCondition,
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

    // 2. Past 2-day orders and payment breakdown (excluding unpaid online checkouts)
    const past2DaysOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twoDaysAgo },
        ...activeOrderCondition,
      },
      include: { payment: true },
    });

    let twoDaysSuccessPayments = 0;
    let twoDaysPendingPayments = 0;
    let twoDaysFailedPayments = 0;
    let twoDaysCodSalesMinor = 0;
    let twoDaysOnlineSalesMinor = 0;
    let twoDaysCodOrderCount = 0;
    let twoDaysOnlineOrderCount = 0;

    past2DaysOrders.forEach((o) => {
      const pStatus = o.payment?.status;
      const isCod = o.payment?.method === "COD";

      if (o.status !== "CANCELLED") {
        if (isCod) {
          twoDaysCodSalesMinor += o.totalMinor;
          twoDaysCodOrderCount++;
        } else if (pStatus === "COMPLETED") {
          twoDaysOnlineSalesMinor += o.totalMinor;
          twoDaysOnlineOrderCount++;
        }
      }

      if (pStatus === "COMPLETED") twoDaysSuccessPayments++;
      else if (pStatus === "FAILED") twoDaysFailedPayments++;
      else twoDaysPendingPayments++;
    });

    // 3. Status Breakdown for the past 2 days
    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: twoDaysAgo },
        ...activeOrderCondition,
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
        ...activeOrderCondition,
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
        ...activeOrderCondition,
      },
      select: { id: true, orderNumber: true, status: true, placedAt: true, totalMinor: true },
      take: 5,
    });

    // Recent orders for dashboard table
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twoDaysAgo },
        ...activeOrderCondition,
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

    // Persisted collection breakdown from DeliveryCollection
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
      if (c.collectionMethod === "CASH") {
        cashCollectedMinor += c.amountMinor;
      } else if (c.collectionMethod === "UPI_MANUAL_VERIFIED" || c.collectionMethod === "ONLINE_DOORSTEP") {
        upiManualConfirmedMinor += c.amountMinor;
      }
      if (c.verificationStatus === "COLLECTED_PENDING_RECONCILIATION" || c.verificationStatus === "PENDING_RECONCILIATION") {
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

    const pendingDeliveries = (statusMap.PLACED || 0) + (statusMap.CONFIRMED || 0) + (statusMap.PREPARING || 0) + (statusMap.OUT_FOR_DELIVERY || 0);
    const deliveredOrders = statusMap.DELIVERED || 0;
    const failedDeliveries = statusMap.CANCELLED || 0;

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
        twoDaysSuccessPayments,
        twoDaysPendingPayments,
        twoDaysFailedPayments,
        twoDaysCodSalesMinor,
        twoDaysOnlineSalesMinor,
        twoDaysCodOrderCount,
        twoDaysOnlineOrderCount,
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
