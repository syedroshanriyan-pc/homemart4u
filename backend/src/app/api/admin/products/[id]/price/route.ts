import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
    const { variantId, newPriceRupees, newPriceMinor } = body;

    // Support either rupees (e.g. 255) or minor paise (e.g. 25500)
    const priceMinor = newPriceMinor ?? Math.round(parseFloat(newPriceRupees) * 100);

    if (isNaN(priceMinor) || priceMinor < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const targetVariant = variantId
      ? product.variants.find((v) => v.id === variantId)
      : product.variants[0];

    if (!targetVariant) {
      return NextResponse.json({ error: "Product variant not found" }, { status: 404 });
    }

    const oldPriceMinor = targetVariant.priceMinor;

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.update({
        where: { id: targetVariant.id },
        data: { priceMinor },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "DAILY_PRICE_UPDATED",
          entityType: "PRODUCT_VARIANT",
          entityId: targetVariant.id,
          metadataJson: JSON.stringify({
            productId: product.id,
            productName: product.name,
            variantName: targetVariant.name,
            oldPriceMinor,
            newPriceMinor: priceMinor,
            oldPriceRupees: oldPriceMinor / 100,
            newPriceRupees: priceMinor / 100,
            effectiveDate: new Date().toISOString(),
          }),
        },
      });

      return v;
    });

    return NextResponse.json({
      success: true,
      message: `Price for ${product.name} (${targetVariant.name}) updated from ₹${oldPriceMinor / 100} to ₹${priceMinor / 100}.`,
      variant: updated,
    });
  } catch (error) {
    console.error("Price update error:", error);
    return NextResponse.json({ error: "Failed to update daily price" }, { status: 500 });
  }
}
