import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    if (!assignment) {
      return NextResponse.json(
        { error: "Delivery assignment not found or access denied." },
        { status: 404 }
      );
    }

    let parsedAddress = null;
    try {
      parsedAddress = JSON.parse(assignment.order.deliveryAddressSnapshot);
    } catch {
      parsedAddress = { addressLine: assignment.order.deliveryAddressSnapshot };
    }

    return NextResponse.json({
      assignment: {
        ...assignment,
        order: {
          ...assignment.order,
          deliveryAddress: parsedAddress,
        },
      },
    });
  } catch (error) {
    console.error("Assignment details error:", error);
    return NextResponse.json({ error: "Failed to load assignment" }, { status: 500 });
  }
}
