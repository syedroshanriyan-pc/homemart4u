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

    const rawMrp = body.mrpMinor !== undefined && body.mrpMinor !== null && String(body.mrpMinor).trim() !== ""
      ? parseInt(String(body.mrpMinor), 10)
      : (body.mrpMinor === null ? null : undefined);
    const parsedMrp = typeof rawMrp === "number" && isNaN(rawMrp) ? null : rawMrp;

    const rawPrice = body.priceMinor !== undefined ? parseInt(String(body.priceMinor), 10) : undefined;
    const validPrice = typeof rawPrice === "number" && !isNaN(rawPrice) ? rawPrice : undefined;

    const rawQty = body.quantityValue ? parseInt(String(body.quantityValue), 10) : undefined;
    const validQty = typeof rawQty === "number" && !isNaN(rawQty) ? rawQty : undefined;

    const updateData: any = {
      name: body.name ? body.name.trim() : undefined,
      slug: body.slug ? body.slug.trim().toLowerCase() : undefined,
      description: body.description !== undefined ? body.description?.trim() || null : undefined,
      categoryId: body.categoryId || undefined,
      productType: body.productType || undefined,
      imageUrl: body.imageUrl || undefined,
      isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      foodType: body.foodType ? (body.foodType === "VEG" || body.foodType === "EGG" ? body.foodType : "NON_VEG") : undefined,
      isHalal: body.isHalal !== undefined ? Boolean(body.isHalal) : undefined,
      mrpMinor: parsedMrp,
      savePriceText: body.savePriceText !== undefined ? (body.savePriceText?.trim() || null) : undefined,
      badgeText: body.badgeText !== undefined ? (body.badgeText?.trim() || null) : undefined,
    };

    // Remove undefined keys
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { variants: true, category: true },
    });

    // If priceMinor or variant data was provided, update the primary variant
    if (validPrice !== undefined || parsedMrp !== undefined || body.variantName || validQty !== undefined) {
      const primaryVariant = product.variants[0];
      if (primaryVariant) {
        await prisma.productVariant.update({
          where: { id: primaryVariant.id },
          data: {
            priceMinor: validPrice,
            mrpMinor: parsedMrp,
            name: body.variantName || undefined,
            quantityValue: validQty,
            quantityUnit: body.quantityUnit || undefined,
            pricingType: body.productType || undefined,
          },
        });
      }
    }

    const updatedProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true, category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_UPDATED",
        entityType: "PRODUCT",
        entityId: id,
        metadataJson: JSON.stringify(body),
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "true";

    if (hard) {
      // Hard delete (for removing test items)
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.customizationGroup.deleteMany({ where: { productId: id } });
      await prisma.product.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Product permanently deleted" });
    }

    // Soft delete product by setting isActive to false to preserve historical order snapshots
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false, isAvailable: false },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_DEACTIVATED",
        entityType: "PRODUCT",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, message: "Product deactivated", product });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
