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
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: { orderBy: { priceMinor: "asc" } },
        customizationGroups: {
          orderBy: { displayOrder: "asc" },
          include: {
            options: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Fetch admin product error:", error);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
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
      displayOrder: body.displayOrder !== undefined ? parseInt(String(body.displayOrder), 10) || 0 : undefined,
    };

    // Remove undefined keys
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    // Perform atomic update inside a transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Update basic product fields
      const product = await tx.product.update({
        where: { id },
        data: updateData,
        include: { variants: true, category: true },
      });

      // 2. Handle nested array of variants if provided
      if (Array.isArray(body.variants) && body.variants.length > 0) {
        const sentVariantIds = new Set(body.variants.map((v: any) => v.id).filter(Boolean));
        // Delete or deactivate removed variants
        const removedVariants = product.variants.filter((v) => !sentVariantIds.has(v.id));
        for (const rem of removedVariants) {
          try {
            await tx.productVariant.delete({ where: { id: rem.id } });
          } catch {
            await tx.productVariant.update({
              where: { id: rem.id },
              data: { isAvailable: false },
            });
          }
        }

        for (const v of body.variants) {
          const vPrice = v.priceMinor !== undefined
            ? parseInt(String(v.priceMinor), 10)
            : (v.priceRs !== undefined ? Math.round(parseFloat(String(v.priceRs)) * 100) : undefined);
          const vMrp = v.mrpMinor !== undefined && v.mrpMinor !== null
            ? parseInt(String(v.mrpMinor), 10)
            : (v.mrpRs !== undefined && v.mrpRs !== null && String(v.mrpRs).trim() !== ""
              ? Math.round(parseFloat(String(v.mrpRs)) * 100)
              : (v.mrpMinor === null || v.mrpRs === null ? null : undefined));

          if (v.id) {
            // Update existing variant
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name ? String(v.name).trim() : undefined,
                priceMinor: vPrice,
                mrpMinor: vMrp,
                quantityValue: v.quantityValue ? parseInt(String(v.quantityValue), 10) : undefined,
                quantityUnit: v.quantityUnit ? String(v.quantityUnit) : undefined,
                pricingType: v.pricingType || body.productType || undefined,
                isAvailable: v.isAvailable !== undefined ? Boolean(v.isAvailable) : undefined,
              },
            });
          } else if (v.name && vPrice !== undefined) {
            // Create new variant
            await tx.productVariant.create({
              data: {
                productId: id,
                name: String(v.name).trim(),
                priceMinor: vPrice,
                mrpMinor: vMrp,
                quantityValue: parseInt(String(v.quantityValue || 1000), 10),
                quantityUnit: v.quantityUnit ? String(v.quantityUnit) : "g",
                pricingType: v.pricingType || body.productType || "WEIGHT",
                isAvailable: v.isAvailable !== undefined ? Boolean(v.isAvailable) : true,
              },
            });
          }
        }
      } else if (validPrice !== undefined || parsedMrp !== undefined || body.variantName || validQty !== undefined) {
        // Legacy single variant update
        const primaryVariant = product.variants[0];
        if (primaryVariant) {
          await tx.productVariant.update({
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

      // 3. Handle customization groups and options if provided
      if (Array.isArray(body.customizationGroups)) {
        const existingGroups = await tx.customizationGroup.findMany({
          where: { productId: id },
          include: { options: true },
        });

        const sentGroupIds = new Set(
          body.customizationGroups.map((g: any) => g.id).filter(Boolean)
        );

        // Delete customization groups that were removed by admin
        const removedGroups = existingGroups.filter((g) => !sentGroupIds.has(g.id));
        for (const remGroup of removedGroups) {
          await tx.customizationGroup.delete({ where: { id: remGroup.id } });
        }

        // Create or update customization groups and their options
        for (let gIdx = 0; gIdx < body.customizationGroups.length; gIdx++) {
          const g = body.customizationGroups[gIdx];
          if (!g || !g.name || !String(g.name).trim()) continue;

          const groupName = String(g.name).trim();
          const selectionType = g.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
          const isRequired = Boolean(g.isRequired);
          const displayOrder = g.displayOrder ?? gIdx;

          if (g.id && existingGroups.some((eg) => eg.id === g.id)) {
            // Update existing group
            await tx.customizationGroup.update({
              where: { id: g.id },
              data: {
                name: groupName,
                selectionType,
                isRequired,
                displayOrder,
              },
            });

            // Handle options in existing group
            const existingOptions = existingGroups.find((eg) => eg.id === g.id)?.options || [];
            const sentOptionIds = new Set(
              (Array.isArray(g.options) ? g.options : []).map((o: any) => o.id).filter(Boolean)
            );

            // Delete removed options
            for (const remOpt of existingOptions) {
              if (!sentOptionIds.has(remOpt.id)) {
                await tx.customizationOption.delete({ where: { id: remOpt.id } });
              }
            }

            // Create or update options
            if (Array.isArray(g.options)) {
              for (let oIdx = 0; oIdx < g.options.length; oIdx++) {
                const opt = g.options[oIdx];
                if (!opt || !opt.name || !String(opt.name).trim()) continue;

                const optPriceDeltaMinor = opt.priceDeltaMinor !== undefined
                  ? parseInt(String(opt.priceDeltaMinor), 10)
                  : (opt.priceDeltaRs !== undefined ? Math.round(parseFloat(String(opt.priceDeltaRs || 0)) * 100) : 0);

                if (opt.id && existingOptions.some((eo) => eo.id === opt.id)) {
                  await tx.customizationOption.update({
                    where: { id: opt.id },
                    data: {
                      name: String(opt.name).trim(),
                      priceDeltaMinor: optPriceDeltaMinor,
                      isActive: opt.isActive !== undefined ? Boolean(opt.isActive) : true,
                      displayOrder: opt.displayOrder ?? oIdx,
                    },
                  });
                } else {
                  await tx.customizationOption.create({
                    data: {
                      groupId: g.id,
                      name: String(opt.name).trim(),
                      priceDeltaMinor: optPriceDeltaMinor,
                      isActive: opt.isActive !== undefined ? Boolean(opt.isActive) : true,
                      displayOrder: opt.displayOrder ?? oIdx,
                    },
                  });
                }
              }
            }
          } else {
            // Create new customization group with options
            await tx.customizationGroup.create({
              data: {
                productId: id,
                name: groupName,
                selectionType,
                isRequired,
                displayOrder,
                options: {
                  create: (Array.isArray(g.options) ? g.options : [])
                    .filter((o: any) => o && o.name && String(o.name).trim())
                    .map((o: any, oIdx: number) => ({
                      name: String(o.name).trim(),
                      priceDeltaMinor: o.priceDeltaMinor !== undefined
                        ? parseInt(String(o.priceDeltaMinor), 10)
                        : (o.priceDeltaRs !== undefined ? Math.round(parseFloat(String(o.priceDeltaRs || 0)) * 100) : 0),
                      isActive: o.isActive !== undefined ? Boolean(o.isActive) : true,
                      displayOrder: o.displayOrder ?? oIdx,
                    })),
                },
              },
            });
          }
        }
      }

      // 4. Return complete updated product
      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          variants: { orderBy: { priceMinor: "asc" } },
          customizationGroups: {
            orderBy: { displayOrder: "asc" },
            include: {
              options: { orderBy: { displayOrder: "asc" } },
            },
          },
        },
      });
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

    // Real-time broadcast
    try {
      publishEvent("catalog", "CATALOG_UPDATED", {
        productId: id,
        action: "PRODUCT_UPDATED",
      });
      publishEvent("admin", "CATALOG_UPDATED", {
        productId: id,
        action: "PRODUCT_UPDATED",
      });
    } catch (e) {
      console.warn("Event publish failed:", e);
    }

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
    if (!session || session.role !== "ADMIN") {
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
      
      try {
        publishEvent("catalog", "CATALOG_UPDATED", { productId: id, action: "PRODUCT_DELETED" });
        publishEvent("admin", "CATALOG_UPDATED", { productId: id, action: "PRODUCT_DELETED" });
      } catch {}

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

    try {
      publishEvent("catalog", "CATALOG_UPDATED", { productId: id, action: "PRODUCT_DEACTIVATED" });
      publishEvent("admin", "CATALOG_UPDATED", { productId: id, action: "PRODUCT_DEACTIVATED" });
    } catch {}

    return NextResponse.json({ success: true, message: "Product deactivated", product });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
