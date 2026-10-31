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
import { notificationProvider } from "@/lib/adapters/NotificationProvider";
import { autoAssignDeliveryPartner } from "@/lib/delivery-assignment";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { sanitizeText, sanitizeAddress } from "@/lib/security";
import { allocateUniqueOrderNumber, generateCollisionResistantOrderNumber } from "@/lib/order-number";
import { sendWhatsAppOrderSummary } from "@/lib/whatsapp";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payment: true,
        deliveryAssignment: {
          include: {
            agent: { select: { id: true, name: true, mobile: true } },
          },
        },
        review: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { error: "Please log in or register to place your order." },
        { status: 401 }
      );
    }

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`order:${session.id}:${ip}`, { maxRequests: 20, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many order requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      items = [],
      addressId,
      customAddress,
      couponCode,
      paymentMethod = "COD",
      notes,
      existingOrderId,
      orderId,
      idempotencyKey,
    } = body;

    const sanitizedNotes = notes ? sanitizeText(notes, 300) : null;

    // 1. Check idempotency key first to prevent duplicate orders from double-clicks or retries
    const cleanIdempotencyKey = idempotencyKey ? String(idempotencyKey).trim() : null;
    if (cleanIdempotencyKey) {
      try {
        const existingOrderByIdempotency = await prisma.order.findUnique({
          where: { idempotencyKey: cleanIdempotencyKey },
          include: { items: true, payment: true },
        });

        if (existingOrderByIdempotency && existingOrderByIdempotency.userId === session.id) {
          return NextResponse.json({
            success: true,
            order: existingOrderByIdempotency,
            idempotentReplay: true,
            message: "Order previously submitted successfully (idempotent replay).",
          });
        }
      } catch (idempErr) {
        console.warn("Idempotency lookup bypassed:", idempErr);
      }
    }

    // 2. Check if an existing order was already created in this checkout session
    const checkOrderId = existingOrderId || orderId;
    if (checkOrderId) {
      const existingOrder = await prisma.order.findFirst({
        where: { id: checkOrderId, userId: session.id },
        include: { payment: true },
      });

      if (
        existingOrder &&
        existingOrder.status === "PLACED" &&
        existingOrder.payment?.status !== "COMPLETED"
      ) {
        if (paymentMethod === "COD") {
          const codFeeMinor = COD_SURCHARGE_PAISE;
          const newTotalMinor = Math.max(
            0,
            existingOrder.subtotalMinor - existingOrder.discountMinor + existingOrder.deliveryFeeMinor + codFeeMinor
          );

          const updated = await prisma.$transaction(async (tx) => {
            const o = await tx.order.update({
              where: { id: existingOrder.id },
              data: {
                codFeeMinor,
                totalMinor: newTotalMinor,
                updatedAt: new Date(),
              },
            });

            const p = await tx.payment.upsert({
              where: { orderId: existingOrder.id },
              update: {
                method: "COD",
                provider: "CASH_ON_DELIVERY",
                status: "PENDING",
                amountMinor: newTotalMinor,
                providerReference: `COD_${existingOrder.orderNumber}_${Date.now()}`,
                updatedAt: new Date(),
              },
              create: {
                orderId: existingOrder.id,
                method: "COD",
                provider: "CASH_ON_DELIVERY",
                status: "PENDING",
                amountMinor: newTotalMinor,
                providerReference: `COD_${existingOrder.orderNumber}_${Date.now()}`,
              },
            });

            await tx.auditLog.create({
              data: {
                actorUserId: session.id,
                action: "ORDER_SWITCHED_TO_COD_FROM_CHECKOUT",
                entityType: "ORDER",
                entityId: existingOrder.id,
                metadataJson: JSON.stringify({
                  orderNumber: existingOrder.orderNumber,
                  reusedExistingOrder: true,
                  newTotalMinor,
                }),
              },
            });

            return { ...o, payment: p };
          });

          return NextResponse.json({
            success: true,
            order: updated,
            reusedExistingOrder: true,
            message: "Existing order updated to COD without duplication.",
          });
        }
      }
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // 3. Determine delivery address
    let deliveryAddressObj: any = null;
    if (addressId) {
      deliveryAddressObj = await prisma.address.findFirst({
        where: { id: addressId, userId: session.id },
      });
    }
    if (!deliveryAddressObj && customAddress && customAddress.addressLine) {
      deliveryAddressObj = sanitizeAddress(customAddress);
    }

    if (!deliveryAddressObj || deliveryAddressObj.latitude == null || deliveryAddressObj.longitude == null) {
      return NextResponse.json(
        { error: "A valid delivery address in Mulbagal is required." },
        { status: 400 }
      );
    }

    const destLat = parseFloat(String(deliveryAddressObj.latitude));
    const destLng = parseFloat(String(deliveryAddressObj.longitude));
    if (isNaN(destLat) || isNaN(destLng)) {
      return NextResponse.json(
        { error: "Invalid delivery coordinates." },
        { status: 400 }
      );
    }

    // 4. Batch query all product variants, options, system settings, and coupons in parallel
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

    const [
      variants,
      customizationOptions,
      systemSettings,
      couponRecord,
    ] = await Promise.all([
      prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: { include: { category: true } },
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
      couponCode
        ? prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } })
        : Promise.resolve(null),
    ]);

    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));
    const optionMap = new Map<string, any>(customizationOptions.map((o: any) => [o.id, o]));

    // 5. Authoritatively validate and build items in-memory
    let subtotalMinor = 0;
    const qualifyingMeatItems: any[] = [];
    const preparedOrderItems: any[] = [];

    for (const item of items) {
      const parsedQty =
        typeof item.quantity === "number"
          ? item.quantity
          : parseInt(String(item.quantity || ""), 10);

      if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 50) {
        return NextResponse.json(
          {
            error: `Invalid quantity for item "${item.variantId || 'cart item'}". Quantity must be a whole number between 1 and 50.`,
          },
          { status: 400 }
        );
      }
      const itemQuantity = parsedQty;

      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.product.isActive) {
        return NextResponse.json(
          { error: `An item in your cart is no longer available in the store.` },
          { status: 400 }
        );
      }

      if (!variant.isAvailable || !variant.product.isAvailable) {
        return NextResponse.json(
          { error: `"${variant.product.name} (${variant.name})" is currently OUT OF STOCK.` },
          { status: 400 }
        );
      }

      let customizationTotalDelta = 0;
      const verifiedCustomizations: any[] = [];
      if (item.customizations && Array.isArray(item.customizations)) {
        for (const c of item.customizations) {
          if (c.optionId) {
            const opt = optionMap.get(c.optionId);
            if (opt) {
              customizationTotalDelta += opt.priceDeltaMinor;
              verifiedCustomizations.push({
                group: c.group || "Customization",
                option: opt.name,
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

      qualifyingMeatItems.push({
        isQualifyingMeat: isChickenCategory,
        weightGrams,
        quantity: itemQuantity,
      });

      preparedOrderItems.push({
        productId: variant.productId,
        variantId: variant.id,
        productNameSnapshot: variant.product.name,
        variantNameSnapshot: variant.name,
        quantity: itemQuantity,
        weightGrams,
        unitPriceMinor,
        lineTotalMinor,
        customizationSnapshotJson:
          verifiedCustomizations.length > 0 ? JSON.stringify(verifiedCustomizations) : null,
      });
    }

    // 6. Validate Minimum Meat Rule
    const meatSetting = systemSettings.find(
      (s) => s.key === "MIN_QUALIFYING_MEAT_GRAMS" || s.key === "minimum_order_meat_grams"
    );
    const minMeatThreshold = meatSetting ? parseInt(meatSetting.value, 10) : 0;
    const meatValidation = validateMinimumMeatOrder(qualifyingMeatItems, minMeatThreshold);
    if (!meatValidation.isValid) {
      return NextResponse.json(
        { error: meatValidation.message || "Minimum meat requirement not met." },
        { status: 400 }
      );
    }

    // 7. Calculate distance and delivery fee
    const shopLatSetting = systemSettings.find((s) => s.key === "SHOP_LAT");
    const shopLngSetting = systemSettings.find((s) => s.key === "SHOP_LNG");
    const shopCoords = {
      lat: shopLatSetting ? parseFloat(shopLatSetting.value) : DEFAULT_SHOP_COORDINATES.lat,
      lng: shopLngSetting ? parseFloat(shopLngSetting.value) : DEFAULT_SHOP_COORDINATES.lng,
    };

    const deliveryDistanceMeters = calculateDistanceMeters(
      shopCoords.lat,
      shopCoords.lng,
      destLat,
      destLng
    );
    const deliveryFeeMinor = calculateDeliveryFeePaise(deliveryDistanceMeters);

    // 8. Validate Coupon
    let discountMinor = 0;
    let validCouponId: string | null = null;
    let couponCodeSnapshot: string | null = null;

    if (couponRecord) {
      const userUsageCount = await prisma.couponRedemption.count({
        where: { couponId: couponRecord.id, userId: session.id },
      });

      const evaluation = evaluateCoupon(
        couponRecord,
        subtotalMinor,
        deliveryFeeMinor,
        userUsageCount
      );
      if (evaluation.isValid) {
        discountMinor = evaluation.discountMinor;
        validCouponId = couponRecord.id;
        couponCodeSnapshot = couponRecord.code;
      }
    }

    // 9. COD Surcharge & Final Total
    const codFeeMinor = paymentMethod === "COD" ? COD_SURCHARGE_PAISE : 0;
    const totalMinor = Math.max(0, subtotalMinor - discountMinor + deliveryFeeMinor + codFeeMinor);

    // 10. Atomic Order Creation with Bounded Retry on OrderNumber Collision (P2002)
    let newOrder: any = null;
    let lastCollisionError: any = null;
    const MAX_ORDER_ATTEMPTS = 4;

    for (let attempt = 1; attempt <= MAX_ORDER_ATTEMPTS; attempt++) {
      try {
        const orderNumber = await allocateUniqueOrderNumber();

        newOrder = await prisma.$transaction(async (tx) => {
          const orderData: any = {
            orderNumber,
            userId: session.id,
            status: "PLACED",
            idempotencyKey: cleanIdempotencyKey || undefined,
            subtotalMinor,
            discountMinor,
            deliveryFeeMinor,
            codFeeMinor,
            totalMinor,
            deliveryDistanceMeters,
            deliveryLatitude: destLat,
            deliveryLongitude: destLng,
            deliveryAddressSnapshot: JSON.stringify(deliveryAddressObj),
            couponId: validCouponId,
            couponCodeSnapshot,
            notes: sanitizedNotes,
            items: {
              create: preparedOrderItems,
            },
            payment: {
              create: {
                method: paymentMethod,
                status: "PENDING",
                amountMinor: totalMinor,
                provider: paymentMethod === "COD" ? "CASH_ON_DELIVERY" : "GATEWAY_UPI",
                providerReference: `${paymentMethod}_${orderNumber}_${Date.now()}`,
              },
            },
          };

          let order;
          try {
            order = await tx.order.create({
              data: orderData,
              include: {
                items: true,
                payment: true,
              },
            });
          } catch (createErr: any) {
            if (createErr?.message?.includes?.("idempotencyKey")) {
              const { idempotencyKey: _, ...safeData } = orderData;
              order = await tx.order.create({
                data: safeData,
                include: {
                  items: true,
                  payment: true,
                },
              });
            } else {
              throw createErr;
            }
          }

          if (validCouponId) {
            await tx.couponRedemption.create({
              data: {
                couponId: validCouponId,
                userId: session.id,
                orderId: order.id,
                discountMinor,
              },
            });
          }

          await tx.auditLog.create({
            data: {
              actorUserId: session.id,
              action: "ORDER_CREATED",
              entityType: "ORDER",
              entityId: order.id,
              metadataJson: JSON.stringify({
                orderNumber,
                totalMinor,
                itemCount: items.length,
                paymentMethod,
                idempotencyKey: cleanIdempotencyKey,
              }),
            },
          });

          return order;
        });

        // Successfully created! Break out of collision retry loop.
        break;
      } catch (err: any) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as any)?.includes?.("orderNumber")
        ) {
          lastCollisionError = err;
          console.warn(`Order number collision detected (attempt ${attempt}/${MAX_ORDER_ATTEMPTS}), retrying...`);
          continue;
        }
        // If it's a P2002 on idempotencyKey, return the existing order
        if (
          cleanIdempotencyKey &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as any)?.includes?.("idempotencyKey")
        ) {
          const existing = await prisma.order.findUnique({
            where: { idempotencyKey: cleanIdempotencyKey },
            include: { items: true, payment: true },
          });
          if (existing) {
            return NextResponse.json({
              success: true,
              order: existing,
              idempotentReplay: true,
              message: "Order placed successfully (concurrent idempotency resolution).",
            });
          }
        }
        throw err;
      }
    }

    if (!newOrder) {
      throw lastCollisionError || new Error("Failed to allocate unique order number after retries.");
    }

    // 11. Transactional notifications & automated delivery assignment in background
    Promise.allSettled([
      notificationProvider.sendTransactional({
        userId: session.id,
        orderNumber: newOrder.orderNumber,
        type: "ORDER_PLACED",
        recipientName: session.name,
        recipientPhone: session.mobile,
        metadata: { totalMinor },
      }),
      sendWhatsAppOrderSummary({
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        user: { mobile: session.mobile, name: session.name },
        items: newOrder.items,
        totalMinor: newOrder.totalMinor,
        paymentMethod: newOrder.payment?.method || paymentMethod,
        payment: newOrder.payment,
      }),
      autoAssignDeliveryPartner(newOrder.id),
    ]).catch((err) => console.warn("Background notification/assignment error:", err));

    return NextResponse.json(
      {
        success: true,
        order: newOrder,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Order creation error:", error);
    const safeError =
      error?.message && !error.message.includes("invocation:") && !error.message.includes("prisma.")
        ? error.message
        : "Failed to place order. Please review your cart and try again.";
    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
