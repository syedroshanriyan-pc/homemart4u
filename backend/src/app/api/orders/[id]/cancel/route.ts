import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notificationProvider } from "@/lib/adapters/NotificationProvider";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason = "Cancelled by user" } = body;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { user: true, payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === session.id;
    const isAdmin = session.role === "ADMIN" ;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Completely remove / block cancel order option for prepaid orders
    const isPrepaid = order.payment && (order.payment.method !== "COD" || order.payment.status === "COMPLETED");
    if (isPrepaid && isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Online cancellation is strictly not available for prepaid orders. Please contact customer support for assistance." },
        { status: 400 }
      );
    }

    // Customers may cancel COD orders only within 3 minutes (180 seconds) of placement
    if (isOwner && !isAdmin) {
      const placedTimestamp = new Date(order.placedAt).getTime();
      const secondsElapsed = (Date.now() - placedTimestamp) / 1000;
      if (secondsElapsed > 180) {
        return NextResponse.json(
          { error: "Order cancellation window expired. Orders can only be cancelled within 3 minutes of order confirmation as kitchen prep has commenced." },
          { status: 400 }
        );
      }

      if (order.status !== "PLACED" && order.status !== "CONFIRMED") {
        return NextResponse.json(
          { error: "Orders can only be cancelled before kitchen preparation begins." },
          { status: 400 }
        );
      }
    }

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: `Cannot cancel an order that is already ${order.status}.` },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: { status: "FAILED" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "ORDER_CANCELLED",
          entityType: "ORDER",
          entityId: order.id,
          metadataJson: JSON.stringify({ reason, previousStatus: order.status }),
        },
      });

      return ord;
    });

    await notificationProvider.sendTransactional({
      userId: order.userId,
      orderNumber: order.orderNumber,
      type: "ORDER_CANCELLED",
      recipientPhone: order.user.mobile,
      recipientName: order.user.name,
      metadata: { reason },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Order cancellation error:", error);
    return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
  }
}
