import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await prisma.product.findMany({
      orderBy: { displayOrder: "asc" },
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

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Admin products error:", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
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
      variants, // optional array of variants
    } = body;

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { error: "Name, slug, and category are required." },
        { status: 400 }
      );
    }

    const parsedMrp = mrpMinor !== undefined && mrpMinor !== null && String(mrpMinor).trim() !== ""
      ? parseInt(String(mrpMinor), 10)
      : null;

    // Build variants to create
    let variantCreateData: any;
    if (Array.isArray(variants) && variants.length > 0) {
      variantCreateData = {
        create: variants.map((v: any) => {
          const vPriceMinor = v.priceMinor !== undefined
            ? parseInt(String(v.priceMinor), 10)
            : Math.round(parseFloat(String(v.priceRs || 0)) * 100);
          const vMrpMinor = v.mrpMinor !== undefined && v.mrpMinor !== null
            ? parseInt(String(v.mrpMinor), 10)
            : (v.mrpRs ? Math.round(parseFloat(String(v.mrpRs)) * 100) : null);
          return {
            name: v.name || "Standard Pack",
            pricingType: v.pricingType || productType,
            quantityValue: parseInt(String(v.quantityValue), 10) || 1000,
            quantityUnit: v.quantityUnit || "g",
            priceMinor: vPriceMinor,
            mrpMinor: vMrpMinor,
            isAvailable: v.isAvailable !== undefined ? Boolean(v.isAvailable) : true,
          };
        }),
      };
    } else {
      if (priceMinor === undefined) {
        return NextResponse.json(
          { error: "Price is required to create a product variant." },
          { status: 400 }
        );
      }
      variantCreateData = {
        create: {
          name: variantName || "Standard Pack",
          pricingType: productType,
          quantityValue: parseInt(String(quantityValue), 10) || 1000,
          quantityUnit,
          priceMinor: parseInt(String(priceMinor), 10),
          mrpMinor: parsedMrp,
          isAvailable: true,
        },
      };
    }

    // Build customization groups to create
    let customizationGroupsCreateData: any = undefined;
    if (Array.isArray(body.customizationGroups) && body.customizationGroups.length > 0) {
      customizationGroupsCreateData = {
        create: body.customizationGroups
          .filter((g: any) => g && g.name && String(g.name).trim())
          .map((g: any, gIdx: number) => ({
            name: String(g.name).trim(),
            selectionType: g.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
            isRequired: Boolean(g.isRequired),
            displayOrder: g.displayOrder ?? gIdx,
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
          })),
      };
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId,
        description: description?.trim() || null,
        productType,
        imageUrl: imageUrl && String(imageUrl).trim() ? String(imageUrl).trim() : null,
        isAvailable: Boolean(isAvailable),
        foodType: foodType === "VEG" || foodType === "EGG" ? foodType : "NON_VEG",
        isHalal: Boolean(isHalal),
        mrpMinor: parsedMrp,
        savePriceText: savePriceText?.trim() || null,
        badgeText: badgeText?.trim() || null,
        variants: variantCreateData,
        customizationGroups: customizationGroupsCreateData,
      },
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

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "PRODUCT_CREATED",
        entityType: "PRODUCT",
        entityId: product.id,
        metadataJson: JSON.stringify({ name: product.name, slug: product.slug }),
      },
    });

    try {
      publishEvent("catalog", "CATALOG_UPDATED", {
        productId: product.id,
        action: "PRODUCT_CREATED",
      });
      publishEvent("admin", "CATALOG_UPDATED", {
        productId: product.id,
        action: "PRODUCT_CREATED",
      });
    } catch (e) {
      console.warn("Event publish failed:", e);
    }

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
