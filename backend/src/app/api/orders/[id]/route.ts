import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        user: { select: { id: true, name: true, mobile: true, email: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, imageUrl: true } },
            variant: { select: { id: true, name: true, pricingType: true } },
          },
        },
        payment: true,
        deliveryAssignment: {
          include: {
            agent: { select: { id: true, name: true, mobile: true } },
          },
        },
        review: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Role-based authorization
    const isOwner = order.userId === session.id;
    const isAdmin = session.role === "ADMIN" ;
    const isAssignedAgent = order.deliveryAssignment?.agentUserId === session.id;

    if (!isOwner && !isAdmin && !isAssignedAgent) {
      return NextResponse.json({ error: "Forbidden: You cannot access this order" }, { status: 403 });
    }

    let parsedAddress = null;
    try {
      parsedAddress = JSON.parse(order.deliveryAddressSnapshot);
    } catch {
      parsedAddress = { addressLine: order.deliveryAddressSnapshot };
    }

      return NextResponse.json({
        order: {
          ...order,
          deliveryAddress: parsedAddress,
        },
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }
  }

const COD_SURCHARGE_PAISE = 700;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    const { id } = await params;
    const body = await req.json();
    const { paymentMethod } = body;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = session && order.userId === session.id;
    const isAdmin = session && (session.role === "ADMIN" );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: You cannot modify this order" }, { status: 403 });
    }

    if (order.status !== "PLACED" && order.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot change payment method for order in ${order.status} state.` },
        { status: 400 }
      );
    }

    if (order.payment?.status === "COMPLETED") {
      return NextResponse.json(
        { error: "This order is already paid and cannot change payment method." },
        { status: 400 }
      );
    }

    if (paymentMethod === "COD") {
      const codFeeMinor = COD_SURCHARGE_PAISE;
      const newTotalMinor = Math.max(
        0,
        order.subtotalMinor - order.discountMinor + order.deliveryFeeMinor + codFeeMinor
      );

      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            codFeeMinor,
            totalMinor: newTotalMinor,
            updatedAt: new Date(),
          },
        });

        const p = await tx.payment.upsert({
          where: { orderId: order.id },
          update: {
            method: "COD",
            provider: "CASH_ON_DELIVERY",
            status: "PENDING",
            amountMinor: newTotalMinor,
            providerReference: `COD_${order.orderNumber}_${Date.now()}`,
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

        return { ...o, payment: p };
      });

      return NextResponse.json({
        success: true,
        order: updated,
        message: "Payment method updated to COD successfully.",
      });
    }

    return NextResponse.json({ error: "Unsupported payment method update" }, { status: 400 });
  } catch (error: any) {
    console.error("Error patching order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
