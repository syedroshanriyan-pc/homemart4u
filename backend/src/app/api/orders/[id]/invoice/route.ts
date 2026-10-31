import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      where: { OR: [{ id }, { orderNumber: id }] },
      include: {
        user: { select: { id: true, name: true, mobile: true, email: true } },
        items: true,
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === session.id;
    const isAdmin = session.role === "ADMIN" ;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let parsedAddress: any = {};
    try {
      parsedAddress = JSON.parse(order.deliveryAddressSnapshot);
    } catch {
      parsedAddress = { addressLine: order.deliveryAddressSnapshot };
    }

    return NextResponse.json({
      invoice: {
        invoiceNumber: `INV-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        date: order.placedAt,
        deliveredAt: order.deliveredAt,
        status: order.status,
        shop: {
          name: "homemart4u",
          tagline: "Fresh Groceries & Farm Fresh Halal Meats",
          address: "Srinivaspur Road, Mulbagal 563131",
          phone: "+91 90355 26638",
          email: "support.homemart4u@gmail.com",
        },
        customer: {
          name: order.user.name,
          mobile: order.user.mobile,
          address: parsedAddress,
        },
        items: order.items.map((i) => ({
          productName: i.productNameSnapshot,
          variantName: i.variantNameSnapshot,
          quantity: i.quantity,
          weightGrams: i.weightGrams,
          unitPriceRs: (i.unitPriceMinor / 100).toFixed(2),
          lineTotalRs: (i.lineTotalMinor / 100).toFixed(2),
        })),
        summary: {
          subtotalRs: (order.subtotalMinor / 100).toFixed(2),
          discountRs: (order.discountMinor / 100).toFixed(2),
          deliveryFeeRs: (order.deliveryFeeMinor / 100).toFixed(2),
          codFeeRs: (order.codFeeMinor / 100).toFixed(2),
          totalRs: (order.totalMinor / 100).toFixed(2),
          paymentMethod: order.payment?.method || "COD",
          paymentStatus: order.payment?.status || "PENDING",
        },
      },
    });
  } catch (error) {
    console.error("Invoice error:", error);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}
