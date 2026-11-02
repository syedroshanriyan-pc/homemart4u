import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const flat = searchParams.get("flat") === "true";

    if (flat) {
      const categories = await prisma.category.findMany({
        orderBy: [{ department: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true, children: true } },
        },
      });
      return NextResponse.json({ categories });
    }

    // Default: Hierarchical list (parent categories with nested children)
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      orderBy: [{ department: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true, children: true } },
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
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      department = "MEAT",
      description,
      imageUrl,
      displayOrder = 0,
      parentId = null,
      isComingSoon = false,
      isActive = true,
    } = body;

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const rawSlug = typeof slug === "string" && slug.trim()
      ? slug.trim().toLowerCase()
      : trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

    if (!rawSlug) {
      return NextResponse.json({ error: "A valid URL slug is required" }, { status: 400 });
    }

    let resolvedDepartment = department === "GROCERY" ? "GROCERY" : "MEAT";

    // Validate parent category if this is a subcategory
    let parentCategory: any = null;
    if (parentId) {
      parentCategory = await prisma.category.findUnique({
        where: { id: String(parentId) },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Selected parent category does not exist." },
          { status: 400 }
        );
      }
      resolvedDepartment = parentCategory.department;
    }

    // Check slug uniqueness
    const existing = await prisma.category.findUnique({ where: { slug: rawSlug } });
    if (existing) {
      return NextResponse.json(
        { error: `A category with the slug '${rawSlug}' already exists. Please choose a distinct name or slug.` },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug: rawSlug,
        parentId: parentCategory ? parentCategory.id : null,
        department: resolvedDepartment,
        description: description ? String(description).trim() : null,
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        displayOrder: parseInt(String(displayOrder), 10) || 0,
        isActive: Boolean(isActive),
        isComingSoon: Boolean(isComingSoon),
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: parentId ? "SUBCATEGORY_CREATED" : "CATEGORY_CREATED",
        entityType: "CATEGORY",
        entityId: category.id,
        metadataJson: JSON.stringify({
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          department: category.department,
        }),
      },
    });

    try {
      publishEvent("admin", "CATEGORIES_UPDATED", {
        categoryId: category.id,
        action: "CREATED",
        timestamp: new Date().toISOString(),
      });
      publishEvent("customer", "CATEGORIES_UPDATED", {
        categoryId: category.id,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Category creation error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A category with this slug already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create category. Please check your inputs and try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      name,
      slug,
      description,
      imageUrl,
      department,
      displayOrder,
      parentId,
      isActive,
      isComingSoon,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const targetCategory = await prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!targetCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Category name cannot be empty" }, { status: 400 });
      }
      updateData.name = trimmed;
    }

    if (slug !== undefined) {
      const trimmedSlug = String(slug).trim().toLowerCase();
      if (!trimmedSlug) {
        return NextResponse.json({ error: "Slug cannot be empty" }, { status: 400 });
      }
      if (trimmedSlug !== targetCategory.slug) {
        const slugCollision = await prisma.category.findUnique({ where: { slug: trimmedSlug } });
        if (slugCollision && slugCollision.id !== id) {
          return NextResponse.json(
            { error: `Slug '${trimmedSlug}' is already in use by another category.` },
            { status: 409 }
          );
        }
        updateData.slug = trimmedSlug;
      }
    }

    if (description !== undefined) {
      updateData.description = description ? String(description).trim() : null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ? String(imageUrl).trim() : null;
    }

    if (department !== undefined) {
      updateData.department = department === "GROCERY" ? "GROCERY" : "MEAT";
    }

    if (displayOrder !== undefined) {
      updateData.displayOrder = parseInt(String(displayOrder), 10) || 0;
    }

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    if (typeof isComingSoon === "boolean") {
      updateData.isComingSoon = isComingSoon;
    }

    // Handle parentId changes (moving subcategories, promoting to main category)
    if (parentId !== undefined) {
      if (parentId === "" || parentId === null) {
        updateData.parentId = null;
      } else {
        const newParentId = String(parentId).trim();
        // Prevent self-parenting
        if (newParentId === id) {
          return NextResponse.json(
            { error: "A category cannot be set as its own parent." },
            { status: 400 }
          );
        }

        // Validate parent exists
        const parentRecord = await prisma.category.findUnique({ where: { id: newParentId } });
        if (!parentRecord) {
          return NextResponse.json({ error: "Target parent category does not exist." }, { status: 400 });
        }

        // Prevent circular hierarchy: verify newParentId is not a descendant of id
        let currentParentCheck: any = parentRecord;
        while (currentParentCheck && currentParentCheck.parentId) {
          if (currentParentCheck.parentId === id) {
            return NextResponse.json(
              { error: "Circular category hierarchy detected. Cannot set a descendant as the parent." },
              { status: 400 }
            );
          }
          currentParentCheck = await prisma.category.findUnique({
            where: { id: currentParentCheck.parentId },
          });
        }

        updateData.parentId = newParentId;
        updateData.department = parentRecord.department;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          orderBy: { displayOrder: "asc" },
          include: { _count: { select: { products: true } } },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "CATEGORY_UPDATED",
        entityType: "CATEGORY",
        entityId: updated.id,
        metadataJson: JSON.stringify(updateData),
      },
    });

    try {
      publishEvent("admin", "CATEGORIES_UPDATED", {
        categoryId: updated.id,
        action: "UPDATED",
        timestamp: new Date().toISOString(),
      });
      publishEvent("customer", "CATEGORIES_UPDATED", {
        categoryId: updated.id,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error("Category update error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Dependency Rule 1: Check associated products
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${category.name}": it is currently assigned to ${category._count.products} product(s). Please reassign or delete these products first.`,
        },
        { status: 400 }
      );
    }

    // Dependency Rule 2: Check subcategories
    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category "${category.name}": it has ${category._count.children} active subcategory/subcategories. Please delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "CATEGORY_DELETED",
        entityType: "CATEGORY",
        entityId: id,
        metadataJson: JSON.stringify({ name: category.name, slug: category.slug }),
      },
    });

    try {
      publishEvent("admin", "CATEGORIES_UPDATED", {
        categoryId: id,
        action: "DELETED",
        timestamp: new Date().toISOString(),
      });
      publishEvent("customer", "CATEGORIES_UPDATED", {
        categoryId: id,
        timestamp: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Category deletion error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
