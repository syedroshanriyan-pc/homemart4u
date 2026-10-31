import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Delivery agent only" }, { status: 403 });
    }

    // Return assignments scoped strictly to this agent (or all if admin)
    const assignments = await prisma.deliveryAssignment.findMany({
      where: {
        ...(session.role === "DELIVERY_AGENT" ? { agentUserId: session.id } : {}),
      },
      orderBy: { assignedAt: "desc" },
      include: {
        order: {
          include: {
            user: { select: { name: true, mobile: true } },
            items: true,
            payment: true,
            deliveryCollection: true,
            paymentAttempts: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Compute delivery & collection accounting metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deliveredAssignments = assignments.filter((a) => a.status === "DELIVERED");

    const stats = {
      totalAssigned: assignments.length,
      totalDelivered: deliveredAssignments.length,
      codDelivered: deliveredAssignments.filter(
        (a) => a.order.payment?.method === "COD" || a.order.codFeeMinor > 0
      ).length,
      onlineDelivered: deliveredAssignments.filter(
        (a) => (a.order.payment?.method !== "COD" && a.order.codFeeMinor === 0)
      ).length,
      convertedToOnline: deliveredAssignments.filter(
        (a) =>
          (a.order.payment?.method === "COD" || a.order.codFeeMinor > 0) &&
          a.order.deliveryCollection?.collectionMethod === "ONLINE_DOORSTEP"
      ).length,
      cashCollectedMinor: deliveredAssignments
        .filter((a) => a.order.deliveryCollection?.collectionMethod === "CASH")
        .reduce((sum, a) => sum + (a.order.deliveryCollection?.amountMinor || 0), 0),
      onlineDoorstepMinor: deliveredAssignments
        .filter((a) => a.order.deliveryCollection?.collectionMethod === "ONLINE_DOORSTEP")
        .reduce((sum, a) => sum + (a.order.deliveryCollection?.amountMinor || 0), 0),
      pendingCashReconciliationMinor: deliveredAssignments
        .filter(
          (a) =>
            a.order.deliveryCollection?.collectionMethod === "CASH" &&
            a.order.deliveryCollection?.verificationStatus === "COLLECTED_PENDING_RECONCILIATION"
        )
        .reduce((sum, a) => sum + (a.order.deliveryCollection?.amountMinor || 0), 0),
    };

    return NextResponse.json({ assignments, stats });
  } catch (error) {
    console.error("Delivery assignments error:", error);
    return NextResponse.json({ error: "Failed to load assignments" }, { status: 500 });
  }
}
