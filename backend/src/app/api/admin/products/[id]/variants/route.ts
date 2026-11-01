import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: { priceMinor: "asc" },
    });

    return NextResponse.json({ variants });
  } catch (error) {
    console.error("Fetch variants error:", error);
    return NextResponse.json({ error: "Failed to load variants" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      quantityValue = 1000,
      quantityUnit = "g",
      priceMinor,
      priceRs,
      mrpMinor,
      mrpRs,
      pricingType,
      isAvailable = true,
    } = body;

    if (!name || (!priceMinor && priceRs === undefined)) {
      return NextResponse.json(
        { error: "Variant name and price are required (e.g. 500g, 1kg, 2kg)." },
        { status: 400 }
      );
    }

    const calculatedPriceMinor = priceMinor !== undefined
      ? parseInt(String(priceMinor), 10)
      : Math.round(parseFloat(String(priceRs)) * 100);

    const calculatedMrpMinor = mrpMinor !== undefined && mrpMinor !== null
      ? parseInt(String(mrpMinor), 10)
      : (mrpRs !== undefined && mrpRs !== null && String(mrpRs).trim() !== ""
        ? Math.round(parseFloat(String(mrpRs)) * 100)
        : null);

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        name: name.trim(),
        quantityValue: parseInt(String(quantityValue), 10) || 1000,
        quantityUnit: quantityUnit || "g",
        priceMinor: calculatedPriceMinor,
        mrpMinor: calculatedMrpMinor,
        pricingType: pricingType || product.productType || "WEIGHT",
        isAvailable: Boolean(isAvailable),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_VARIANT_CREATED",
        entityType: "PRODUCT_VARIANT",
        entityId: variant.id,
        metadataJson: JSON.stringify({
          productId: id,
          productName: product.name,
          variantName: variant.name,
          priceMinor: calculatedPriceMinor,
        }),
      },
    });

    // Real-time broadcast
    try {
      publishEvent("catalog", "CATALOG_UPDATED", {
        productId: id,
        variantId: variant.id,
        action: "VARIANT_CREATED",
      });
      publishEvent("admin", "CATALOG_UPDATED", {
        productId: id,
        variantId: variant.id,
        action: "VARIANT_CREATED",
      });
    } catch (e) {
      console.warn("Event publish failed:", e);
    }

    return NextResponse.json({ success: true, variant });
  } catch (error) {
    console.error("Create variant error:", error);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}

