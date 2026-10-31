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
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Delivery agent only" }, { status: 403 });
    }

    const { id } = await params;

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        OR: [{ id }, { orderId: id }],
        ...(session.role === "DELIVERY_AGENT" ? { agentUserId: session.id } : {}),
      },
      include: {
        order: { include: { user: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Delivery assignment not found or access denied." },
        { status: 404 }
      );
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const a = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "STARTED",
          startedAt: now,
        },
      });

      await tx.order.update({
        where: { id: assignment.orderId },
        data: {
          status: "OUT_FOR_DELIVERY",
          outForDeliveryAt: now,
        },
      });

      await tx.deliveryAgentProfile.updateMany({
        where: { userId: session.id },
        data: { availabilityStatus: "BUSY" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "DELIVERY_STARTED",
          entityType: "ORDER",
          entityId: assignment.orderId,
          metadataJson: JSON.stringify({ assignmentId: assignment.id }),
        },
      });

      return a;
    });

    await notificationProvider.sendTransactional({
      userId: assignment.order.userId,
      orderNumber: assignment.order.orderNumber,
      type: "ORDER_OUT_FOR_DELIVERY",
      recipientPhone: assignment.order.user.mobile,
      recipientName: assignment.order.user.name,
    });

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error("Start delivery error:", error);
    return NextResponse.json({ error: "Failed to start delivery" }, { status: 500 });
  }
}
