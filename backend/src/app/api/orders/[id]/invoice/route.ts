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
        deliveryAssignment: {
          select: { agentUserId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isOwner = order.userId === session.id;
    const isAdmin = session.role === "ADMIN";
    const isAssignedAgent = order.deliveryAssignment?.agentUserId === session.id;
    const isStaff = session.role === "DELIVERY_AGENT";

    if (!isOwner && !isAdmin && !isAssignedAgent && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let parsedAddress: any = {};
    try {
      parsedAddress = typeof order.deliveryAddressSnapshot === "string" 
        ? JSON.parse(order.deliveryAddressSnapshot)
        : order.deliveryAddressSnapshot;
    } catch {
      parsedAddress = { addressLine: order.deliveryAddressSnapshot || "Mulbagal Town" };
    }

    return NextResponse.json({
      invoice: {
        invoiceNumber: `INV-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        date: order.placedAt,
        deliveredAt: order.deliveredAt,
        status: order.status,
        shop: {
          name: "HomeMart4U",
          tagline: "Farm Fresh Halal Meats & Daily Groceries",
          address: "Srinivaspur Road, Mulbagal, Karnataka 563131",
          phone: "+91 90355 26638",
          email: "support.homemart4u@gmail.com",
          gstNumber: "29AABCH2026M1Z5",
          fssaiNumber: "11223334000123",
        },
        customer: {
          name: order.user?.name || "Customer",
          mobile: order.user?.mobile || "",
          email: order.user?.email || "",
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
