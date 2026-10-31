import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const COD_SURCHARGE_PAISE = 700; // ₹7.00

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Role-based authorization: Owner or Admin
    const isOwner = session && order.userId === session.id;
    const isAdmin = session && (session.role === "ADMIN" );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify this order" },
        { status: 403 }
      );
    }

    // Cannot switch payment method if already paid/confirmed/delivered/cancelled
    if (order.status !== "PLACED" && order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot change payment method for order in ${order.status} state.` },
        { status: 400 }
      );
    }

    if (order.payment?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This order has already been paid online and cannot be changed to COD." },
        { status: 400 }
      );
    }

    // If already COD, return existing order idempotently
    if (order.payment?.method === "COD") {
      return NextResponse.json({
        success: true,
        order,
        message: "Order is already set to Cash on Delivery",
      });
    }

    // Calculate new total including COD surcharge
    const codFeeMinor = COD_SURCHARGE_PAISE;
    const newTotalMinor = Math.max(
      0,
      order.subtotalMinor - order.discountMinor + order.deliveryFeeMinor + codFeeMinor
    );

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update order amounts
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          codFeeMinor,
          totalMinor: newTotalMinor,
          updatedAt: new Date(),
        },
      });

      // 2. Update payment record to COD
      const p = await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          method: "COD",
          provider: "CASH_ON_DELIVERY",
          status: "PENDING",
          amountMinor: newTotalMinor,
          providerReference: `COD_${order.orderNumber}_${Date.now()}`,
          upiTxnRef: null,
          upiApp: null,
          updatedAt: new Date(),
        },
        create: {
          orderId: order.id,
          method: "COD",
          provider: "CASH_ON_DELIVERY",
          status: "PENDING",
          amountMinor: newTotalMinor,
          providerReference: `COD_${order.orderNumber}_${Date.now()}`,
        },
      });

      // 3. Log audit event
      if (order.userId) {
        await tx.auditLog.create({
          data: {
            actorUserId: order.userId,
            action: "ORDER_SWITCHED_TO_COD",
            entityType: "ORDER",
            entityId: order.id,
            metadataJson: JSON.stringify({
              orderNumber: order.orderNumber,
              oldTotalMinor: order.totalMinor,
              newTotalMinor,
              codFeeMinor,
              previousMethod: order.payment?.method || "ONLINE",
              switchedAt: new Date().toISOString(),
            }),
          },
        });
      }

      return { ...o, payment: p };
    });

    return NextResponse.json({
      success: true,
      order: updated,
      message: "Order successfully switched to Cash on Delivery with no duplication.",
    });
  } catch (error: any) {
    console.error("Error switching order to COD:", error);
    return NextResponse.json(
      { error: "Failed to switch payment method to COD" },
      { status: 500 }
    );
  }
}
