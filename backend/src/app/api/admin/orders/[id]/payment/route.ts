import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { status, note } = body;

    if (!status || !["PENDING", "COMPLETED", "FAILED", "REFUNDED"].includes(status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updatedPayment = await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        status,
        updatedAt: new Date(),
      },
      create: {
        orderId: order.id,
        method: "UPI",
        status,
        amountMinor: order.totalMinor,
        provider: "ADMIN_MANUAL_OVERRIDE",
        providerReference: `ADMIN_${session.id}_${Date.now()}`,
      },
    });

    // If marked completed, update order status to CONFIRMED if it was PLACED
    if (status === "COMPLETED" && order.status === "PLACED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });
    }

    // Log admin action
    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "ADMIN_PAYMENT_STATUS_UPDATE",
        entityType: "ORDER",
        entityId: order.id,
        metadataJson: JSON.stringify({
          orderNumber: order.orderNumber,
          oldStatus: order.payment?.status,
          newStatus: status,
          note,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error("Admin payment update error:", error);
    return NextResponse.json({ error: "Failed to update payment: " + error.message }, { status: 500 });
  }
}
