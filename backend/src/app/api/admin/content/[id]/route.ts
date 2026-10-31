import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/content/[id]
 * Updates, publishes/unpublishes, changes priority, or schedules an offer/announcement.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.offerContent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedBy: session.id,
      updatedAt: new Date(),
    };

    if (body.title !== undefined) updateData.title = String(body.title).trim().slice(0, 150);
    if (body.description !== undefined) updateData.description = String(body.description).trim().slice(0, 500);
    if (body.type !== undefined) updateData.type = body.type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "OFFER";
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
    if (body.ctaLabel !== undefined) updateData.ctaLabel = body.ctaLabel ? String(body.ctaLabel).trim().slice(0, 50) : null;
    if (body.couponCode !== undefined) updateData.couponCode = body.couponCode ? String(body.couponCode).trim().toUpperCase().slice(0, 30) : null;

    if (body.ctaUrl !== undefined) {
      if (!body.ctaUrl) {
        updateData.ctaUrl = null;
      } else {
        const trimmed = String(body.ctaUrl).trim();
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("javascript:")) {
          updateData.ctaUrl = trimmed;
        } else {
          return NextResponse.json(
            { error: "CTA URL must be a relative internal path starting with '/'" },
            { status: 400 }
          );
        }
      }
    }

    if (body.status !== undefined && ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(body.status)) {
      updateData.status = body.status;
    }

    if (body.priority !== undefined) {
      const p = Number(body.priority);
      if (Number.isInteger(p)) updateData.priority = p;
    }

    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;

    const updated = await prisma.offerContent.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "OFFER_CONTENT_UPDATED",
        entityType: "OFFER_CONTENT",
        entityId: id,
        metadataJson: JSON.stringify({ status: updated.status, priority: updated.priority }),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update offer content error:", error);
    return NextResponse.json({ error: "Failed to update content item" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content/[id]
 * Deletes or archives an offer/announcement.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.offerContent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Content item not found" }, { status: 404 });
    }

    await prisma.offerContent.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "OFFER_CONTENT_DELETED",
        entityType: "OFFER_CONTENT",
        entityId: id,
        metadataJson: JSON.stringify({ title: existing.title }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete offer content error:", error);
    return NextResponse.json({ error: "Failed to delete content item" }, { status: 500 });
  }
}
