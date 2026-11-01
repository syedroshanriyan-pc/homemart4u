import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id, variantId } = await params;
    const body = await req.json();

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (body.name !== undefined) {
      updateData.name = String(body.name).trim();
    }
    if (body.quantityValue !== undefined) {
      updateData.quantityValue = parseInt(String(body.quantityValue), 10);
    }
    if (body.quantityUnit !== undefined) {
      updateData.quantityUnit = String(body.quantityUnit);
    }
    if (body.priceMinor !== undefined) {
      updateData.priceMinor = parseInt(String(body.priceMinor), 10);
    } else if (body.priceRs !== undefined) {
      updateData.priceMinor = Math.round(parseFloat(String(body.priceRs)) * 100);
    }

    if (body.mrpMinor !== undefined) {
      updateData.mrpMinor = body.mrpMinor === null ? null : parseInt(String(body.mrpMinor), 10);
    } else if (body.mrpRs !== undefined) {
      updateData.mrpMinor = body.mrpRs === null || String(body.mrpRs).trim() === ""
        ? null
        : Math.round(parseFloat(String(body.mrpRs)) * 100);
    }

    if (body.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(body.isAvailable);
    }
    if (body.pricingType !== undefined) {
      updateData.pricingType = String(body.pricingType);
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_VARIANT_UPDATED",
        entityType: "PRODUCT_VARIANT",
        entityId: variantId,
        metadataJson: JSON.stringify(updateData),
      },
    });

    try {
      publishEvent("catalog", "CATALOG_UPDATED", {
        productId: id,
        variantId,
        action: "VARIANT_UPDATED",
      });
      publishEvent("admin", "CATALOG_UPDATED", {
        productId: id,
        variantId,
        action: "VARIANT_UPDATED",
      });
    } catch (e) {
      console.warn("Event publish failed:", e);
    }

    return NextResponse.json({ success: true, variant: updated });
  } catch (error) {
    console.error("Update variant error:", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id, variantId } = await params;

    const existing = await prisma.productVariant.findFirst({
      where: { id: variantId, productId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    // Check if variant is referenced in previous orders
    const orderItemsCount = await prisma.orderItem.count({
      where: { variantId },
    });

    if (orderItemsCount > 0) {
      // Soft-delete: mark unavailable so past orders are preserved
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { isAvailable: false },
      });
    } else {
      // Hard-delete: completely remove unreferenced variant
      await prisma.productVariant.delete({
        where: { id: variantId },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_VARIANT_DELETED",
        entityType: "PRODUCT_VARIANT",
        entityId: variantId,
        metadataJson: JSON.stringify({ productId: id, variantName: existing.name, orderItemsCount }),
      },
    });

    try {
      publishEvent("catalog", "CATALOG_UPDATED", {
        productId: id,
        variantId,
        action: "VARIANT_DELETED",
      });
      publishEvent("admin", "CATALOG_UPDATED", {
        productId: id,
        variantId,
        action: "VARIANT_DELETED",
      });
    } catch (e) {
      console.warn("Event publish failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Variant "${existing.name}" removed successfully.`,
    });
  } catch (error) {
    console.error("Delete variant error:", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}

