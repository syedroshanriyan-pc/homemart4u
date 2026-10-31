import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeMobile, sanitizeText, sanitizeEmail } from "@/lib/security";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 1. GET Single Delivery Agent
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const agent = await prisma.user.findUnique({
      where: { id, role: "DELIVERY_AGENT" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        status: true,
        createdAt: true,
        deliveryProfile: true,
        assignedDeliveries: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: { id: true, orderNumber: true, totalMinor: true, status: true },
            },
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Delivery agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Get delivery agent error:", error);
    return NextResponse.json({ error: "Failed to load delivery agent" }, { status: 500 });
  }
}

// 2. PUT / PATCH: Update Delivery Agent Details
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, mobile, email, password, status, availabilityStatus } = body;

    const existingAgent = await prisma.user.findUnique({
      where: { id, role: "DELIVERY_AGENT" },
      include: { deliveryProfile: true },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Delivery agent not found" }, { status: 404 });
    }

    const updateUserData: any = {};

    if (name) {
      updateUserData.name = sanitizeText(name, 100);
    }

    if (mobile) {
      const sanitizedMobile = sanitizeMobile(mobile);
      if (!sanitizedMobile) {
        return NextResponse.json({ error: "Valid 10-digit mobile number is required" }, { status: 400 });
      }
      // Check collision
      const mobileConflict = await prisma.user.findFirst({
        where: { mobile: sanitizedMobile, id: { not: id } },
      });
      if (mobileConflict) {
        return NextResponse.json({ error: "Another user already has this mobile number" }, { status: 409 });
      }
      updateUserData.mobile = sanitizedMobile;
    }

    if (email !== undefined) {
      const sanitizedEmail = email ? sanitizeEmail(email) : null;
      if (sanitizedEmail) {
        const emailConflict = await prisma.user.findFirst({
          where: { email: sanitizedEmail, id: { not: id } },
        });
        if (emailConflict) {
          return NextResponse.json({ error: "Another user already has this email address" }, { status: 409 });
        }
      }
      updateUserData.email = sanitizedEmail;
    }

    if (status && ["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
      updateUserData.status = status;
    }

    if (password && String(password).trim().length >= 6) {
      updateUserData.passwordHash = await hashPassword(String(password).trim());
    }

    const targetAvailability =
      availabilityStatus && ["AVAILABLE", "BUSY", "OFFLINE"].includes(availabilityStatus)
        ? availabilityStatus
        : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: updateUserData,
      });

      if (targetAvailability || status) {
        await tx.deliveryAgentProfile.upsert({
          where: { userId: id },
          update: {
            ...(targetAvailability ? { availabilityStatus: targetAvailability } : {}),
            ...(status ? { isActive: status === "ACTIVE" } : {}),
          },
          create: {
            userId: id,
            availabilityStatus: targetAvailability || "AVAILABLE",
            isActive: status === "ACTIVE",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "DELIVERY_AGENT_UPDATED",
          entityType: "USER",
          entityId: id,
          metadataJson: JSON.stringify({
            updatedFields: Object.keys(updateUserData),
            availabilityStatus: targetAvailability,
          }),
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: "Delivery agent updated successfully",
      agent: {
        id: updated.id,
        name: updated.name,
        mobile: updated.mobile,
        email: updated.email,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error("Update delivery agent error:", error);
    return NextResponse.json({ error: "Failed to update delivery agent: " + (error?.message || "") }, { status: 500 });
  }
}

// 3. DELETE: Delete Delivery Agent
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    const agent = await prisma.user.findUnique({
      where: { id, role: "DELIVERY_AGENT" },
      include: {
        assignedDeliveries: {
          where: { status: { in: ["ASSIGNED", "STARTED"] } },
          select: { id: true, orderId: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Delivery agent not found" }, { status: 404 });
    }

    if (agent.assignedDeliveries && agent.assignedDeliveries.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete ${agent.name}: Executive has ${agent.assignedDeliveries.length} active order delivery run(s) in progress. Please complete or reassign active orders first.`,
        },
        { status: 400 }
      );
    }

    // Safely delete historical completed assignment links, delivery profile, and user account atomically
    await prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.deleteMany({ where: { agentUserId: id } });
      await tx.deliveryAgentProfile.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "DELIVERY_AGENT_DELETED",
          entityType: "USER",
          entityId: id,
          metadataJson: JSON.stringify({ name: agent.name, mobile: agent.mobile }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Delivery executive "${agent.name}" has been deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete delivery agent error:", error);
    return NextResponse.json({ error: "Failed to delete delivery agent: " + (error?.message || "") }, { status: 500 });
  }
}
