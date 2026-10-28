import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content
 * Returns all promotional offers and announcements for the admin CMS.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const items = await prisma.offerContent.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Admin content fetch error:", error);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}

/**
 * POST /api/admin/content
 * Creates a new offer or announcement in the CMS.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin clearance required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      type = "OFFER",
      imageUrl,
      ctaLabel,
      ctaUrl,
      couponCode,
      status = "DRAFT",
      priority = 0,
      startDate,
      endDate,
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required." },
        { status: 400 }
      );
    }

    // Validate safe URL if provided
    let safeCtaUrl: string | null = null;
    if (ctaUrl && typeof ctaUrl === "string") {
      const trimmed = ctaUrl.trim();
      if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("javascript:")) {
        safeCtaUrl = trimmed;
      } else {
        return NextResponse.json(
          { error: "CTA URL must be a relative path starting with '/' (e.g. /menu/fresh-chicken)." },
          { status: 400 }
        );
      }
    }

    const parsedPriority = Number.isInteger(Number(priority)) ? Number(priority) : 0;

    const item = await prisma.offerContent.create({
      data: {
        title: title.trim().slice(0, 150),
        description: description.trim().slice(0, 500),
        type: type === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "OFFER",
        imageUrl: imageUrl?.trim() || null,
        ctaLabel: ctaLabel?.trim()?.slice(0, 50) || null,
        ctaUrl: safeCtaUrl,
        couponCode: couponCode?.trim()?.toUpperCase()?.slice(0, 30) || null,
        status: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(status) ? status : "DRAFT",
        priority: parsedPriority,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: session.id,
        updatedBy: session.id,
      },
    });

    // Record audit event
    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "OFFER_CONTENT_CREATED",
        entityType: "OFFER_CONTENT",
        entityId: item.id,
        metadataJson: JSON.stringify({ title: item.title, type: item.type, status: item.status }),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Create offer content error:", error);
    return NextResponse.json({ error: "Failed to create content item" }, { status: 500 });
  }
}
