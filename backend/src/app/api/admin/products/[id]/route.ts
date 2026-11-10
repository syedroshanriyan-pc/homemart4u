import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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
  const { id } = await params;
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();

    // 1. Verify target product existence before starting transaction
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        category: true,
        customizationGroups: { include: { options: true } },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: `Product with ID '${id}' not found.`, code: "PRODUCT_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 2. Validate URL slug uniqueness if slug is being updated
    if (body.slug !== undefined) {
      const cleanSlug = String(body.slug).trim().toLowerCase();
      if (!cleanSlug) {
        return NextResponse.json(
          { error: "Product URL slug cannot be empty.", code: "EMPTY_SLUG" },
          { status: 400 }
        );
      }
      if (cleanSlug !== existingProduct.slug) {
        const slugCollision = await prisma.product.findFirst({
          where: { slug: cleanSlug, id: { not: id } },
        });
        if (slugCollision) {
          return NextResponse.json(
            {
              error: `URL slug '${cleanSlug}' is already in use by another product ("${slugCollision.name}"). Please choose a unique slug.`,
              code: "SLUG_COLLISION",
            },
            { status: 409 }
          );
        }
      }
    }

    // 3. Validate category existence if categoryId is being updated
    if (body.categoryId !== undefined && body.categoryId !== null) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: body.categoryId },
      });
      if (!categoryExists) {
        return NextResponse.json(
          {
            error: `Category '${body.categoryId}' does not exist.`,
            code: "CATEGORY_NOT_FOUND",
          },
          { status: 400 }
        );
      }
    }

    // 4. Validate variants array if provided
    if (Array.isArray(body.variants)) {
      if (body.variants.length === 0) {
        return NextResponse.json(
          { error: "A product must have at least one variant.", code: "EMPTY_VARIANTS" },
          { status: 400 }
        );
      }
      for (let i = 0; i < body.variants.length; i++) {
        const v = body.variants[i];
        if (!v || typeof v !== "object") continue;
        if (!v.name || !String(v.name).trim()) {
          return NextResponse.json(
            { error: `Variant #${i + 1} must have a non-empty name.`, code: "INVALID_VARIANT_NAME" },
            { status: 400 }
          );
        }
        const vPrice = v.priceMinor !== undefined
          ? parseInt(String(v.priceMinor), 10)
          : (v.priceRs !== undefined && String(v.priceRs).trim() !== "" ? Math.round(parseFloat(String(v.priceRs)) * 100) : NaN);

        if (isNaN(vPrice) || vPrice <= 0) {
          return NextResponse.json(
            { error: `Variant "${v.name}" must have a valid selling price greater than 0.`, code: "INVALID_VARIANT_PRICE" },
            { status: 400 }
          );
        }
        if (v.id) {
          const belongs = existingProduct.variants.some((ev) => ev.id === v.id);
          if (!belongs) {
            return NextResponse.json(
              { error: `Variant ID '${v.id}' does not belong to this product.`, code: "VARIANT_MISMATCH" },
              { status: 400 }
            );
          }
        }
      }
    }

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
      imageUrl: body.imageUrl !== undefined ? (body.imageUrl && String(body.imageUrl).trim() ? String(body.imageUrl).trim() : null) : undefined,
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
        // Delete or deactivate removed variants with explicit OrderItem check
        // to avoid aborting the PostgreSQL transaction block
        const removedVariants = existingProduct.variants.filter((v) => !sentVariantIds.has(v.id));
        for (const rem of removedVariants) {
          const orderItemsCount = await tx.orderItem.count({
            where: { variantId: rem.id },
          });

          if (orderItemsCount > 0) {
            // Soft-deactivate variant to preserve historical order records
            await tx.productVariant.update({
              where: { id: rem.id },
              data: { isAvailable: false },
            });
          } else {
            // Safe to permanently delete unreferenced variant
            await tx.productVariant.delete({ where: { id: rem.id } });
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
  } catch (error: any) {
    const correlationId = crypto.randomUUID();
    console.error(`[AdminProductUpdate][${correlationId}] Error updating product ${id}:`, error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error: "A product with this unique field (such as URL slug) already exists. Please choose a unique slug or name.",
          code: "P2002",
          correlationId,
        },
        { status: 409 }
      );
    }

    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          error: "Cannot update or delete this record because it is referenced by existing orders or catalog items.",
          code: "P2003",
          correlationId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error?.message || "Failed to update product",
        code: error?.code || "PRODUCT_UPDATE_FAILED",
        correlationId,
      },
      { status: 500 }
    );
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
      // Hard delete: verify product does not have linked historical orders
      const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
      if (orderItemCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot permanently delete product: it is associated with ${orderItemCount} historical order item(s). Use soft deactivation instead to preserve order records.`,
          },
          { status: 400 }
        );
      }

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
