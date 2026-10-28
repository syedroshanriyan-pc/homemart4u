import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppDeliveryStatus } from "@/lib/whatsapp";

/**
 * POST /api/delivery/assignments/[id]/deliver
 * Marks an order as delivered, records physical or online collection, and triggers customer delivery notification.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Delivery agent only" }, { status: 403 });
    }

    const { id } = await params;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional if default cash / prepaid is used
    }

    const assignment = await prisma.deliveryAssignment.findFirst({
      where: {
        OR: [{ id }, { orderId: id }],
        ...(session.role === "DELIVERY_AGENT" ? { agentUserId: session.id } : {}),
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, mobile: true } },
            payment: true,
            deliveryCollection: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Delivery assignment not found or access denied." },
        { status: 404 }
      );
    }

    // Prevent duplicate delivery completion
    if (assignment.status === "DELIVERED" || assignment.order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Order is already delivered. Duplicate completion rejected." },
        { status: 400 }
      );
    }

    const isOriginallyCod =
      assignment.order.payment?.method === "COD" || assignment.order.codFeeMinor > 0;

    let requestedMethod = body.collectionMethod || (isOriginallyCod ? "CASH" : "CASH");
    if (requestedMethod === "ONLINE_DOORSTEP" || requestedMethod === "UPI") {
      requestedMethod = "UPI_MANUAL_VERIFIED";
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark assignment DELIVERED
      const a = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
        },
      });

      // 2. Mark order DELIVERED
      const ord = await tx.order.update({
        where: { id: assignment.orderId },
        data: {
          status: "DELIVERED",
          deliveredAt: now,
        },
      });

      // 3. Mark payment completed with authoritative collection method
      const isUpiManual = requestedMethod === "UPI_MANUAL_VERIFIED";
      await tx.payment.upsert({
        where: { orderId: assignment.orderId },
        update: {
          status: "COMPLETED",
          method: isUpiManual ? "UPI" : "COD",
          provider: isUpiManual ? "UPI_MANUAL_VERIFIED" : "CASH",
        },
        create: {
          orderId: assignment.orderId,
          amountMinor: assignment.order.totalMinor,
          status: "COMPLETED",
          method: isUpiManual ? "UPI" : "COD",
          provider: isUpiManual ? "UPI_MANUAL_VERIFIED" : "CASH",
        },
      });

      // 4. Create or update DeliveryCollection record (idempotent, strictly one per order)
      const verificationStatus = isUpiManual
        ? "MANUAL_AGENT_CONFIRMED"
        : "COLLECTED_PENDING_RECONCILIATION";

      const collectionRecord = await tx.deliveryCollection.upsert({
        where: { orderId: assignment.orderId },
        update: {
          collectionMethod: requestedMethod,
          amountMinor: assignment.order.totalMinor,
          verificationStatus,
          collectedAt: now,
          notes: body.notes || (isUpiManual ? "Doorstep UPI manual agent confirmation" : "Doorstep cash collected"),
        },
        create: {
          orderId: assignment.orderId,
          agentUserId: assignment.agentUserId,
          collectionMethod: requestedMethod,
          amountMinor: assignment.order.totalMinor,
          verificationStatus,
          collectedAt: now,
          notes: body.notes || (isUpiManual ? "Doorstep UPI manual agent confirmation" : "Doorstep cash collected"),
        },
      });

      // 5. Update agent status back to AVAILABLE
      await tx.deliveryAgentProfile.updateMany({
        where: { userId: assignment.agentUserId },
        data: { availabilityStatus: "AVAILABLE" },
      });

      // 6. Audit record
      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: isUpiManual ? "DOORSTEP_UPI_MANUAL_VERIFIED" : "DOORSTEP_CASH_COLLECTED",
          entityType: "ORDER",
          entityId: assignment.orderId,
          metadataJson: JSON.stringify({
            assignmentId: assignment.id,
            deliveredAt: now,
            agentUserId: assignment.agentUserId,
            originalPaymentMethod: assignment.order.payment?.method || "COD",
            actualCollectionMethod: requestedMethod,
            amountMinor: assignment.order.totalMinor,
            verificationStatus,
          }),
        },
      });

      return { assignment: a, order: ord, collection: collectionRecord };
    });

    // 7. Dispatch WhatsApp Delivered Notification
    if (assignment.order.user?.mobile) {
      try {
        await sendWhatsAppDeliveryStatus(
          {
            id: assignment.order.id,
            orderNumber: assignment.order.orderNumber,
            user: assignment.order.user,
          },
          "DELIVERED"
        );
      } catch (notifErr) {
        console.warn("[DELIVERED_WHATSAPP_NOTICE_SKIPPED]", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully marked as DELIVERED.",
      order: result.order,
      assignment: result.assignment,
      collection: result.collection,
    });
  } catch (error: any) {
    console.error("Mark delivered error:", error);
    return NextResponse.json({ error: "Failed to mark order as delivered" }, { status: 500 });
  }
}
