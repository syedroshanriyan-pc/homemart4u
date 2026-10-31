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
    const { agentUserId } = body;

    if (!agentUserId) {
      return NextResponse.json({ error: "Agent user ID is required" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      include: { deliveryAssignment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const agent = await prisma.user.findFirst({
      where: { id: agentUserId, role: "DELIVERY_AGENT", status: "ACTIVE" },
      include: { deliveryProfile: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Active delivery agent not found" }, { status: 404 });
    }

    const assignment = await prisma.$transaction(async (tx) => {
      // Create or update assignment
      const assign = await tx.deliveryAssignment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          agentUserId: agent.id,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
        update: {
          agentUserId: agent.id,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
      });

      // Update agent availability status to BUSY
      await tx.deliveryAgentProfile.upsert({
        where: { userId: agent.id },
        create: {
          userId: agent.id,
          availabilityStatus: "BUSY",
        },
        update: {
          availabilityStatus: "BUSY",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "DELIVERY_ASSIGNED",
          entityType: "ORDER",
          entityId: order.id,
          metadataJson: JSON.stringify({
            agentId: agent.id,
            agentName: agent.name,
          }),
        },
      });

      return assign;
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error("Assign delivery error:", error);
    return NextResponse.json({ error: "Failed to assign delivery agent" }, { status: 500 });
  }
}
