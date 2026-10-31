import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
    const { status } = body; // PUBLISHED, HIDDEN, PENDING

    if (!["PUBLISHED", "HIDDEN", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid review status" }, { status: 400 });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "REVIEW_STATUS_UPDATED",
        entityType: "REVIEW",
        entityId: id,
        metadataJson: JSON.stringify({ status }),
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Update review status error:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}
