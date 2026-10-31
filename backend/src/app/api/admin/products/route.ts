import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        category: true,
        variants: { orderBy: { priceMinor: "asc" } },
        customizationGroups: {
          include: { options: true },
        },
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Admin products error:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      slug,
      categoryId,
      description,
      productType = "WEIGHT",
      imageUrl,
      priceMinor,
      mrpMinor,
      savePriceText,
      badgeText,
      foodType = "NON_VEG",
      isHalal = false,
      variantName,
      quantityValue = 1000,
      quantityUnit = "g",
      isAvailable = true,
    } = body;

    if (!name || !slug || !categoryId || priceMinor === undefined) {
      return NextResponse.json(
        { error: "Name, slug, category, and price are required." },
        { status: 400 }
      );
    }

    const parsedMrp = mrpMinor !== undefined && mrpMinor !== null && String(mrpMinor).trim() !== ""
      ? parseInt(String(mrpMinor), 10)
      : null;

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId,
        description: description?.trim() || null,
        productType,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80",
        isAvailable: Boolean(isAvailable),
        foodType: foodType === "VEG" || foodType === "EGG" ? foodType : "NON_VEG",
        isHalal: Boolean(isHalal),
        mrpMinor: parsedMrp,
        savePriceText: savePriceText?.trim() || null,
        badgeText: badgeText?.trim() || null,
        variants: {
          create: {
            name: variantName || "Standard Pack",
            pricingType: productType,
            quantityValue: parseInt(quantityValue, 10) || 1000,
            quantityUnit,
            priceMinor: parseInt(priceMinor, 10),
            mrpMinor: parsedMrp,
            isAvailable: true,
          },
        },
      },
      include: {
        category: true,
        variants: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_CREATED",
        entityType: "PRODUCT",
        entityId: product.id,
        metadataJson: JSON.stringify({ name: product.name, slug: product.slug }),
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Product create error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A product with this slug already exists. Please choose a unique slug or name." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create product. Please verify your inputs and try again." },
      { status: 500 }
    );
  }
}
