import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Admin categories error:", error);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, department = "MEAT", description, imageUrl, displayOrder = 0 } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.trim().toLowerCase(),
        department: department === "GROCERY" ? "GROCERY" : "MEAT",
        description,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80",
        displayOrder: parseInt(displayOrder, 10) || 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "CATEGORY_CREATED",
        entityType: "CATEGORY",
        entityId: category.id,
        metadataJson: JSON.stringify({ name: category.name }),
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Category creation error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A category with this slug already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create category. Please check your inputs and try again." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isComingSoon, isActive, name, description, displayOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const data: any = {};
    if (typeof isComingSoon === "boolean") data.isComingSoon = isComingSoon;
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder, 10);

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "CATEGORY_UPDATED",
        entityType: "CATEGORY",
        entityId: updated.id,
        metadataJson: JSON.stringify(data),
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error("Category update error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

