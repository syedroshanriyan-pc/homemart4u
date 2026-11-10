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

    // 5. Validate customization groups and options if provided
    if (Array.isArray(body.customizationGroups)) {
      for (let i = 0; i < body.customizationGroups.length; i++) {
        const g = body.customizationGroups[i];
        if (!g || !g.name || !String(g.name).trim()) {
          return NextResponse.json(
            { error: `Customization group #${i + 1} must have a title.`, code: "INVALID_CUSTOMIZATION_GROUP_NAME" },
            { status: 400 }
          );
        }
        if (g.id) {
          const groupBelongs = existingProduct.customizationGroups.some((eg) => eg.id === g.id);
          if (!groupBelongs) {
            return NextResponse.json(
              { error: `Customization group ID '${g.id}' does not belong to this product.`, code: "GROUP_MISMATCH" },
              { status: 400 }
            );
          }
        }

        if (Array.isArray(g.options)) {
          const existingGroup = g.id ? existingProduct.customizationGroups.find((eg) => eg.id === g.id) : null;
          for (let j = 0; j < g.options.length; j++) {
            const opt = g.options[j];
            if (!opt || !opt.name || !String(opt.name).trim()) {
              return NextResponse.json(
                { error: `Option #${j + 1} in group "${g.name}" must have a name.`, code: "INVALID_OPTION_NAME" },
                { status: 400 }
              );
            }
            if (opt.id && existingGroup) {
              const optBelongs = existingGroup.options.some((eo) => eo.id === opt.id);
              if (!optBelongs) {
                return NextResponse.json(
                  { error: `Customization option ID '${opt.id}' does not belong to group '${g.name}'.`, code: "OPTION_MISMATCH" },
                  { status: 400 }
                );
              }
            }
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

    // Perform atomic update inside a transaction with bounded timeout and optimized queries
    const updatedProduct = await prisma.$transaction(
      async (tx) => {
        // 1. Update basic product fields
        await tx.product.update({
          where: { id },
          data: updateData,
        });

        // 2. Handle nested array of variants if provided
        if (Array.isArray(body.variants) && body.variants.length > 0) {
          const sentVariantIds = new Set(body.variants.map((v: any) => v.id).filter(Boolean));
          const removedVariants = existingProduct.variants.filter((v) => !sentVariantIds.has(v.id));

          if (removedVariants.length > 0) {
            const removedVariantIds = removedVariants.map((v) => v.id);
            // Single batched query to check order items referencing removed variants
            const referencedOrderItems = await tx.orderItem.findMany({
              where: { variantId: { in: removedVariantIds } },
              select: { variantId: true },
              distinct: ["variantId"],
            });
            const referencedVariantIdsSet = new Set(referencedOrderItems.map((item) => item.variantId));

            const toDeactivateIds = removedVariantIds.filter((vid) => referencedVariantIdsSet.has(vid));
            const toDeleteIds = removedVariantIds.filter((vid) => !referencedVariantIdsSet.has(vid));

            if (toDeactivateIds.length > 0) {
              await tx.productVariant.updateMany({
                where: { id: { in: toDeactivateIds } },
                data: { isAvailable: false },
              });
            }

            if (toDeleteIds.length > 0) {
              await tx.productVariant.deleteMany({
                where: { id: { in: toDeleteIds } },
              });
            }
          }

          // Process incoming variants
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
          const primaryVariant = existingProduct.variants[0];
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
          const existingGroups = existingProduct.customizationGroups;
          const sentGroupIds = new Set(
            body.customizationGroups.map((g: any) => g.id).filter(Boolean)
          );

          // Batched delete of removed customization groups (cascades to options)
          const removedGroupIds = existingGroups
            .filter((g) => !sentGroupIds.has(g.id))
            .map((g) => g.id);

          if (removedGroupIds.length > 0) {
            await tx.customizationGroup.deleteMany({
              where: { id: { in: removedGroupIds } },
            });
          }

          // Batched delete of removed options across all groups
          const allRemovedOptionIds: string[] = [];
          for (const g of body.customizationGroups) {
            if (g.id) {
              const existingG = existingGroups.find((eg) => eg.id === g.id);
              if (existingG) {
                const sentOptionIds = new Set(
                  (Array.isArray(g.options) ? g.options : []).map((o: any) => o.id).filter(Boolean)
                );
                for (const remOpt of existingG.options) {
                  if (!sentOptionIds.has(remOpt.id)) {
                    allRemovedOptionIds.push(remOpt.id);
                  }
                }
              }
            }
          }

          if (allRemovedOptionIds.length > 0) {
            await tx.customizationOption.deleteMany({
              where: { id: { in: allRemovedOptionIds } },
            });
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

              const existingOptions = existingGroups.find((eg) => eg.id === g.id)?.options || [];

              if (Array.isArray(g.options)) {
                const newOptionsToCreate: any[] = [];
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
                    newOptionsToCreate.push({
                      groupId: g.id,
                      name: String(opt.name).trim(),
                      priceDeltaMinor: optPriceDeltaMinor,
                      isActive: opt.isActive !== undefined ? Boolean(opt.isActive) : true,
                      displayOrder: opt.displayOrder ?? oIdx,
                    });
                  }
                }

                if (newOptionsToCreate.length > 0) {
                  await tx.customizationOption.createMany({
                    data: newOptionsToCreate,
                  });
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

        // 4. Return complete updated product - explicitly awaited before returning
        const finalProduct = await tx.product.findUnique({
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

        return finalProduct;
      },
      {
        maxWait: 5000,  // Max wait to acquire connection from pool
        timeout: 15000, // Max bounded execution time for interactive transaction
      }
    );

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

    // Prisma Transaction Lifecycle Errors (P2028: Transaction not found / timed out / already closed)
    if (
      error?.code === "P2028" ||
      String(error?.message).includes("Transaction not found") ||
      String(error?.message).includes("old closed transaction")
    ) {
      const isTimeout =
        String(error?.message).toLowerCase().includes("timed out") ||
        String(error?.message).toLowerCase().includes("timeout") ||
        String(error?.message).includes("Transaction not found");

      return NextResponse.json(
        {
          error: isTimeout
            ? "Database transaction timed out. The operation was safely rolled back. Please retry saving."
            : "Database transaction was closed prematurely. Please retry saving.",
          code: isTimeout ? "TRANSACTION_TIMEOUT" : "TRANSACTION_CLOSED",
          correlationId,
        },
        { status: 504 }
      );
    }

    // Database Connection Failure (P1001, P1002, P1017)
    if (error?.code === "P1001" || error?.code === "P1002" || error?.code === "P1017") {
      return NextResponse.json(
        {
          error: "Database connection failed or timed out reaching the connection pool. Please verify network connectivity and retry.",
          code: "DATABASE_CONNECTION_ERROR",
          correlationId,
        },
        { status: 503 }
      );
    }

    // Unique Constraint Violation (P2002)
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

    // Foreign Key Constraint Violation (P2003)
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

    // Record Not Found (P2025)
    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error: "One or more target records could not be found.",
          code: "RECORD_NOT_FOUND",
          correlationId,
        },
        { status: 404 }
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
