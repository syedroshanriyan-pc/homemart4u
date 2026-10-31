import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  calculateDeliveryFeePaise,
  calculateDistanceMeters,
  DEFAULT_SHOP_COORDINATES,
  COD_SURCHARGE_PAISE,
} from "@/lib/delivery";
import { validateMinimumMeatOrder } from "@/lib/minimum-order";
import { evaluateCoupon } from "@/lib/coupons";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`cart-validate:${ip}`, { maxRequests: 40, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many validation requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds), ...rateLimitHeaders(rateLimit) } }
      );
    }
    const [session, body] = await Promise.all([
      getSessionUser(req),
      req.json().catch(() => ({})),
    ]);

    const { items = [], addressId, coordinates, couponCode, paymentMethod = "ONLINE" } = body;

    const errors: string[] = [];
    const itemDetails: any[] = [];
    let subtotalMinor = 0;
    const qualifyingItems: any[] = [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        isValid: false,
        subtotalMinor: 0,
        discountMinor: 0,
        deliveryDistanceMeters: 0,
        deliveryFeeMinor: 0,
        codFeeMinor: 0,
        totalMinor: 0,
        qualifyingMeatGrams: 0,
        isMinMeatMet: true,
        meatShortfallGrams: 0,
        coupon: null,
        items: [],
        errors: [],
      });
    }

    // 1. Gather all variant IDs and customization option IDs for single-batch query
    const variantIds: string[] = Array.from(
      new Set(items.map((i: any) => String(i.variantId)).filter(Boolean))
    );
    const optionIds: string[] = Array.from(
      new Set(
        items
          .flatMap((i: any) => (Array.isArray(i.customizations) ? i.customizations : []))
          .map((c: any) => String(c.optionId))
          .filter(Boolean)
      )
    );

    // 2. Fetch variants, customization options, system settings, address, and coupon in parallel
    const [
      variants,
      customizationOptions,
      systemSettings,
      addressObj,
      couponRecord,
    ] = await Promise.all([
      prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            include: { category: true },
          },
        },
      }),
      optionIds.length > 0
        ? prisma.customizationOption.findMany({
            where: { id: { in: optionIds }, isActive: true },
          })
        : Promise.resolve([]),
      prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              "SHOP_LAT",
              "SHOP_LNG",
              "MIN_QUALIFYING_MEAT_GRAMS",
              "minimum_order_meat_grams",
            ],
          },
        },
      }),
      addressId
        ? prisma.address.findUnique({ where: { id: addressId } })
        : Promise.resolve(null),
      couponCode
        ? prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } })
        : Promise.resolve(null),
    ]);

    // Build O(1) lookup maps
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));
    const optionMap = new Map<string, any>(customizationOptions.map((o: any) => [o.id, o]));

    // 3. Validate and calculate each item in-memory
    for (const item of items) {
      const parsedQty =
        typeof item.quantity === "number"
          ? item.quantity
          : parseInt(String(item.quantity || ""), 10);

      if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 50) {
        errors.push(`Invalid quantity for requested item. Quantity must be between 1 and 50.`);
        continue;
      }
      const itemQuantity = parsedQty;

      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.product.isActive) {
        errors.push(`A requested product is no longer available in the store.`);
        continue;
      }

      if (!variant.isAvailable || !variant.product.isAvailable) {
        errors.push(`"${variant.product.name} (${variant.name})" is currently OUT OF STOCK.`);
      }

      let customizationTotalDelta = 0;
      const verifiedCustomizations: any[] = [];
      if (Array.isArray(item.customizations)) {
        for (const c of item.customizations) {
          if (c.optionId) {
            const opt = optionMap.get(c.optionId);
            if (opt) {
              customizationTotalDelta += opt.priceDeltaMinor;
              verifiedCustomizations.push({
                optionId: opt.id,
                name: opt.name,
                priceDeltaMinor: opt.priceDeltaMinor,
              });
            }
          }
        }
      }

      const unitPriceMinor = variant.priceMinor + customizationTotalDelta;
      const lineTotalMinor = unitPriceMinor * itemQuantity;
      subtotalMinor += lineTotalMinor;

      const isChickenCategory =
        variant.product.category.slug === "fresh-chicken" ||
        variant.product.category.slug === "masala-special";

      const weightGrams =
        variant.pricingType === "WEIGHT" || variant.quantityUnit === "g"
          ? variant.quantityValue
          : null;

      qualifyingItems.push({
        isQualifyingMeat: isChickenCategory,
        weightGrams,
        quantity: itemQuantity,
      });

      itemDetails.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        quantity: itemQuantity,
        unitPriceMinor,
        lineTotalMinor,
        isQualifyingMeat: isChickenCategory,
        weightGrams,
        customizations: verifiedCustomizations,
      });
    }

    // 4. Minimum Meat threshold check
    const meatSetting = systemSettings.find(
      (s) => s.key === "MIN_QUALIFYING_MEAT_GRAMS" || s.key === "minimum_order_meat_grams"
    );
    const minMeatThreshold = meatSetting ? parseInt(meatSetting.value, 10) : 0;
    const meatValidation = validateMinimumMeatOrder(qualifyingItems, minMeatThreshold);
    if (!meatValidation.isValid && items.length > 0) {
      errors.push(meatValidation.message || "Minimum meat requirement not met.");
    }

    // 5. Delivery distance & fee calculation
    let deliveryDistanceMeters = 0;
    let deliveryFeeMinor = 0;
    let targetCoords = coordinates;

    if (addressObj) {
      targetCoords = { lat: addressObj.latitude, lng: addressObj.longitude };
    }

    if (targetCoords?.lat != null && targetCoords?.lng != null) {
      const shopLatSetting = systemSettings.find((s) => s.key === "SHOP_LAT");
      const shopLngSetting = systemSettings.find((s) => s.key === "SHOP_LNG");

      const shopCoords = {
        lat: shopLatSetting ? parseFloat(shopLatSetting.value) : DEFAULT_SHOP_COORDINATES.lat,
        lng: shopLngSetting ? parseFloat(shopLngSetting.value) : DEFAULT_SHOP_COORDINATES.lng,
      };

      const targetLat = parseFloat(String(targetCoords.lat));
      const targetLng = parseFloat(String(targetCoords.lng));

      if (!isNaN(targetLat) && !isNaN(targetLng)) {
        deliveryDistanceMeters = calculateDistanceMeters(
          shopCoords.lat,
          shopCoords.lng,
          targetLat,
          targetLng
        );
        deliveryFeeMinor = calculateDeliveryFeePaise(deliveryDistanceMeters);
      }
    }

    // 6. Coupon validation
    let discountMinor = 0;
    let couponResult: any = null;

    if (couponCode && couponRecord) {
      let userUsageCount = 0;
      if (session) {
        userUsageCount = await prisma.couponRedemption.count({
          where: { couponId: couponRecord.id, userId: session.id },
        });
      }

      const evaluation = evaluateCoupon(
        couponRecord,
        subtotalMinor,
        deliveryFeeMinor,
        userUsageCount
      );
      if (!evaluation.isValid) {
        errors.push(evaluation.message || "Coupon cannot be applied to this order.");
      } else {
        discountMinor = evaluation.discountMinor;
        couponResult = {
          id: couponRecord.id,
          code: couponRecord.code,
          discountMinor: evaluation.discountMinor,
          isFreeDelivery: evaluation.isFreeDelivery,
        };
      }
    } else if (couponCode && !couponRecord) {
      errors.push(`Coupon code "${couponCode}" is invalid.`);
    }

    // 7. COD Surcharge & Total
    const codFeeMinor =
      paymentMethod === "COD" && items.length > 0 ? COD_SURCHARGE_PAISE : 0;
    const totalMinor = Math.max(
      0,
      subtotalMinor - discountMinor + deliveryFeeMinor + codFeeMinor
    );

    return NextResponse.json(
      {
        isValid: errors.length === 0 && items.length > 0,
        subtotalMinor,
        discountMinor,
        deliveryDistanceMeters,
        deliveryFeeMinor,
        codFeeMinor,
        totalMinor,
        qualifyingMeatGrams: meatValidation.totalGrams,
        isMinMeatMet: meatValidation.isValid,
        meatShortfallGrams: meatValidation.shortfallGrams,
        coupon: couponResult,
        items: itemDetails,
        errors,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Cart validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate cart. Please try again." },
      { status: 500 }
    );
  }
}
