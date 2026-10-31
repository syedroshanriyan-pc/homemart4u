import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Requirement: Auto-delete records older than 2 days (48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const purgeResult = await prisma.order.deleteMany({
      where: {
        createdAt: { lt: twoDaysAgo },
      },
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");

    // Statutory requirement: Before successful payment in UPI, the admin should NOT see the order.
    // Online/UPI orders are visible to admin ONLY when payment is COMPLETED.
    // COD orders are visible immediately since payment is collected upon doorstep delivery.
    const activeConfirmedOrderCondition = {
      OR: [
        { payment: { method: "COD" } },
        { payment: { status: "COMPLETED" } },
      ],
    };

    const where: any = {
      // Show only past 2 days records
      createdAt: { gte: twoDaysAgo },
      AND: [activeConfirmedOrderCondition],
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      if (paymentStatus === "COMPLETED" || paymentStatus === "SUCCESS") {
        where.AND.push({ payment: { status: "COMPLETED" } });
      } else if (paymentStatus === "FAILED" || paymentStatus === "FAILURE") {
        where.AND.push({ payment: { status: "FAILED" } });
      } else if (paymentStatus === "PENDING") {
        where.AND.push({ payment: { method: "COD", status: "PENDING" } });
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { mobile: { contains: search } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, mobile: true, email: true } },
        items: true,
        payment: true,
        deliveryAssignment: {
          include: {
            agent: { select: { id: true, name: true, mobile: true } },
          },
        },
      },
    });

    // Calculate live payment stats for the past 2 days (excluding unpaid online checkouts)
    const all2DaysOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: twoDaysAgo },
        OR: [
          { payment: { method: "COD" } },
          { payment: { status: "COMPLETED" } },
        ],
      },
      include: { payment: true },
    });

    let successCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    all2DaysOrders.forEach((o) => {
      const pStatus = o.payment?.status;
      if (pStatus === "COMPLETED") successCount++;
      else if (pStatus === "FAILED") failedCount++;
      else pendingCount++;
    });

    return NextResponse.json({
      orders,
      stats: {
        total: all2DaysOrders.length,
        successCount,
        pendingCount,
        failedCount,
        purgedOldCount: purgeResult.count,
        twoDaysCutoff: twoDaysAgo.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin orders list error:", error);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const result = await prisma.order.deleteMany({
      where: {
        createdAt: { lt: twoDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully purged ${result.count} records older than 48 hours.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Purge failed: " + error.message }, { status: 500 });
  }
}
