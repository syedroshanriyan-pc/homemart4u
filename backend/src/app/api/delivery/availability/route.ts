import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Delivery agent only" }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body; // AVAILABLE, BUSY, OFFLINE

    if (!["AVAILABLE", "BUSY", "OFFLINE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const profile = await prisma.deliveryAgentProfile.upsert({
      where: { userId: session.id },
      create: {
        userId: session.id,
        availabilityStatus: status,
      },
      update: {
        availabilityStatus: status,
      },
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Availability update error:", error);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
