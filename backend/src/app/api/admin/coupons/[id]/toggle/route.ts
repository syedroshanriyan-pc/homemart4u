import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function handleToggle(
  req: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    let nextStatus = !coupon.isActive;
    try {
      const body = await req.json();
      if (typeof body?.isActive === "boolean") {
        nextStatus = body.isActive;
      }
    } catch {
      // Body not provided or not JSON, default to toggle
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: nextStatus },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "COUPON_TOGGLED",
        entityType: "COUPON",
        entityId: id,
        metadataJson: JSON.stringify({ code: coupon.code, isActive: updated.isActive }),
      },
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error) {
    console.error("Coupon toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle coupon" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleToggle(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleToggle(req, params);
}
