import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationProvider } from "@/lib/adapters/NotificationProvider";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, reason } = body;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { user: true, deliveryAssignment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Enforce business rule: Out for Delivery and Delivered are exclusively marked by the delivery partner
    if (status === "OUT_FOR_DELIVERY" || status === "DELIVERED") {
      return NextResponse.json(
        {
          error:
            "Out for Delivery and Delivered statuses must be marked directly by the assigned Delivery Partner via the Delivery Portal upon hub departure and doorstep handover/COD receipt.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const updateData: any = { status };

    if (status === "CONFIRMED") updateData.confirmedAt = now;
    if (status === "PREPARING") updateData.preparingAt = now;
    if (status === "CANCELLED") {
      updateData.cancelledAt = now;
      updateData.cancellationReason = reason || "Cancelled by store administrator";
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      if (status === "DELIVERED" && order.deliveryAssignment) {
        await tx.deliveryAssignment.update({
          where: { id: order.deliveryAssignment.id },
          data: { status: "DELIVERED", deliveredAt: now },
        });

        await tx.deliveryAgentProfile.updateMany({
          where: { userId: order.deliveryAssignment.agentUserId },
          data: { availabilityStatus: "AVAILABLE" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: `ORDER_STATUS_CHANGED_${status}`,
          entityType: "ORDER",
          entityId: order.id,
          metadataJson: JSON.stringify({ from: order.status, to: status, reason }),
        },
      });

      return ord;
    });

    // Send transactional notification
    const notificationTypes: Record<string, any> = {
      CONFIRMED: "ORDER_CONFIRMED",
      PREPARING: "ORDER_PREPARING",
      OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
      DELIVERED: "ORDER_DELIVERED",
      CANCELLED: "ORDER_CANCELLED",
    };

    if (notificationTypes[status]) {
      try {
        await notificationProvider.sendTransactional({
          userId: order.userId,
          orderNumber: order.orderNumber,
          type: notificationTypes[status],
          recipientPhone: order.user.mobile,
          recipientName: order.user.name,
          metadata: { reason },
        });
      } catch (err) {
        console.warn("Notification error:", err);
      }
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
