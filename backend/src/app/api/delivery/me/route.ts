import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized: Delivery agent access required" }, { status: 403 });
    }

    const [profile, completedToday, activeAssignment, allAgentAssignments, collections] = await Promise.all([
      prisma.deliveryAgentProfile.findUnique({
        where: { userId: session.id },
        include: {
          user: { select: { id: true, name: true, mobile: true, email: true, status: true } },
        },
      }),
      prisma.deliveryAssignment.count({
        where: {
          agentUserId: session.id,
          status: "DELIVERED",
          deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.deliveryAssignment.findFirst({
        where: {
          agentUserId: session.id,
          status: { in: ["ASSIGNED", "STARTED"] },
        },
        include: {
          order: {
            include: {
              items: true,
              payment: true,
              user: { select: { name: true, mobile: true } },
            },
          },
        },
      }),
      prisma.deliveryAssignment.findMany({
        where: { agentUserId: session.id },
        select: {
          status: true,
          order: {
            select: {
              totalMinor: true,
              payment: { select: { status: true } },
            },
          },
        },
      }),
      prisma.deliveryCollection.findMany({
        where: { agentUserId: session.id },
        select: {
          amountMinor: true,
          collectionMethod: true,
          verificationStatus: true,
        },
      }),
    ]);

    // Calculate agent metrics from persisted records
    let assignedOrders = 0;
    let ordersAwaitingDelivery = 0;
    let completedDeliveries = 0;
    let outstandingBalanceMinor = 0;

    allAgentAssignments.forEach((a) => {
      assignedOrders++;
      if (a.status === "ASSIGNED" || a.status === "STARTED") {
        ordersAwaitingDelivery++;
        if (a.order.payment?.status !== "COMPLETED") {
          outstandingBalanceMinor += a.order.totalMinor;
        }
      } else if (a.status === "DELIVERED") {
        completedDeliveries++;
      }
    });

    let cashCollectedMinor = 0;
    let upiManualConfirmedMinor = 0;

    collections.forEach((c) => {
      if (c.collectionMethod === "CASH") {
        cashCollectedMinor += c.amountMinor;
      } else if (c.collectionMethod === "UPI_MANUAL_VERIFIED" || c.collectionMethod === "ONLINE_DOORSTEP") {
        upiManualConfirmedMinor += c.amountMinor;
      }
    });

    const totalCollectedMinor = cashCollectedMinor + upiManualConfirmedMinor;

    return NextResponse.json({
      agent: {
        id: session.id,
        name: session.name,
        mobile: session.mobile,
        availabilityStatus: profile?.availabilityStatus || "AVAILABLE",
        isActive: profile?.isActive ?? true,
      },
      completedToday,
      activeAssignment,
      metrics: {
        assignedOrders,
        ordersAwaitingDelivery,
        completedDeliveries,
        cashCollectedMinor,
        upiManualConfirmedMinor,
        totalCollectedMinor,
        outstandingBalanceMinor,
      },
    });
  } catch (error) {
    console.error("Delivery me error:", error);
    return NextResponse.json({ error: "Failed to load agent profile" }, { status: 500 });
  }
}
