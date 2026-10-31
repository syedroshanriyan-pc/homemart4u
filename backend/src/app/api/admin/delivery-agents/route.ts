import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeMobile, sanitizeText, sanitizeEmail } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const agents = await prisma.user.findMany({
      where: { role: "DELIVERY_AGENT" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        status: true,
        createdAt: true,
        deliveryProfile: true,
        assignedDeliveries: {
          where: { status: { in: ["ASSIGNED", "STARTED"] } },
          include: {
            order: {
              select: { id: true, orderNumber: true, totalMinor: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Admin delivery agents error:", error);
    return NextResponse.json({ error: "Failed to load delivery agents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, mobile, email, password } = body;

    const sanitizedMobile = sanitizeMobile(mobile);
    const sanitizedName = sanitizeText(name, 100);
    const sanitizedEmail = email ? sanitizeEmail(email) : null;

    if (!sanitizedName || !sanitizedMobile || !password || String(password).length < 6) {
      return NextResponse.json(
        { error: "Valid name, 10-digit mobile number, and password (min 6 characters) are required." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ mobile: sanitizedMobile }, ...(sanitizedEmail ? [{ email: sanitizedEmail }] : [])] },
    });

    if (existing) {
      return NextResponse.json({ error: "User with this mobile or email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const agent = await prisma.user.create({
      data: {
        name: sanitizedName,
        mobile: sanitizedMobile,
        email: sanitizedEmail,
        passwordHash,
        role: "DELIVERY_AGENT",
        status: "ACTIVE",
        deliveryProfile: {
          create: {
            availabilityStatus: "AVAILABLE",
            isActive: true,
          },
        },
      },
      include: { deliveryProfile: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "DELIVERY_AGENT_CREATED",
        entityType: "USER",
        entityId: agent.id,
        metadataJson: JSON.stringify({ name: agent.name, mobile: agent.mobile }),
      },
    });

    const { passwordHash: _, ...safeAgent } = agent;
    return NextResponse.json({ success: true, agent: safeAgent });
  } catch (error: any) {
    console.error("Create agent error:", error);
    return NextResponse.json({ error: "Failed to add delivery agent. Please verify your inputs and try again." }, { status: 500 });
  }
}
