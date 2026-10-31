import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildUpiUri, generateUpiIntentLinks, generateUpiQrDataUrl } from "@/lib/upi";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

// In-memory cache for operational UPI settings to eliminate database bottlenecks
let settingsCache: { vpa?: string; name?: string; expiry: number } = { expiry: 0 };

async function getCachedUpiSettings(): Promise<{ vpa: string; payeeName: string }> {
  const now = Date.now();
  if (settingsCache.expiry > now && settingsCache.vpa && settingsCache.name) {
    return { vpa: settingsCache.vpa, payeeName: settingsCache.name };
  }

  try {
    const records = await prisma.systemSetting.findMany({
      where: { key: { in: ["UPI_VPA", "UPI_MERCHANT_NAME"] } },
      select: { key: true, value: true },
    });

    const vpaRow = records.find((r) => r.key === "UPI_VPA");
    const nameRow = records.find((r) => r.key === "UPI_MERCHANT_NAME");

    const vpa = vpaRow?.value?.trim() || process.env.UPI_VPA || process.env.NEXT_PUBLIC_UPI_VPA || "7975137618@okbizaxis";
    const payeeName = nameRow?.value?.trim() || process.env.NEXT_PUBLIC_UPI_MERCHANT_NAME || "Fresh Chicken Centre";

    settingsCache = { vpa, name: payeeName, expiry: now + 60000 };
    return { vpa, payeeName };
  } catch {
    return {
      vpa: process.env.UPI_VPA || process.env.NEXT_PUBLIC_UPI_VPA || "7975137618@okbizaxis",
      payeeName: process.env.NEXT_PUBLIC_UPI_MERCHANT_NAME || "Fresh Chicken Centre",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`dynamic-qr:${ip}`, { maxRequests: 40, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many dynamic QR requests. Please wait a moment." }, { status: 429 });
    }

    const [session, body] = await Promise.all([
      getSessionUser(req),
      req.json().catch(() => ({})),
    ]);

    const { orderId, amountRupees, orderNumber: bodyOrderNumber } = body;
    let targetOrderNumber = bodyOrderNumber;
    let targetAmountRupees = amountRupees;

    // Concurrent order verification and settings retrieval
    const [order, { vpa, payeeName }] = await Promise.all([
      orderId
        ? prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, userId: true, orderNumber: true, totalMinor: true },
          })
        : Promise.resolve(null),
      getCachedUpiSettings(),
    ]);

    if (orderId) {
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Verify user ownership if order belongs to a registered user
      if (order.userId && (!session || (order.userId !== session.id && session.role !== "ADMIN" ))) {
        return NextResponse.json({ error: "Unauthorized access to order" }, { status: 403 });
      }

      targetOrderNumber = order.orderNumber;
      targetAmountRupees = order.totalMinor / 100;
    }

    if (!targetAmountRupees || targetAmountRupees <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const orderNumber = targetOrderNumber || `FC-${Date.now().toString().slice(-4)}`;
    const transactionRef = `TXN_${orderNumber}_${Date.now()}`;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      "https://homemart4u.vercel.app";
    const callbackUrl = `${appUrl}/checkout?orderId=${orderId || orderNumber}`;

    const upiDetails = {
      vpa,
      payeeName,
      amountRupees: parseFloat(targetAmountRupees),
      orderNumber,
      transactionRef,
      note: `Payment for Order ${orderNumber}`,
      callbackUrl,
      mc: process.env.UPI_MCC || undefined,
    };

    const upiUri = buildUpiUri(upiDetails);
    const intentLinks = generateUpiIntentLinks(upiDetails);

    // Concurrently generate QR code and update payment record in database
    const [qrDataUrl] = await Promise.all([
      generateUpiQrDataUrl(upiUri).catch(() => undefined),
      orderId
        ? prisma.payment.updateMany({
            where: { orderId, status: { in: ["PENDING", "FAILED"] } },
            data: {
              status: "PENDING",
              qrPayload: upiUri,
              providerReference: transactionRef,
              updatedAt: new Date(),
            },
          })
        : Promise.resolve(null),
    ]);

    const now = new Date();

    return NextResponse.json(
      {
        success: true,
        payeeName,
        amountRupees: upiDetails.amountRupees,
        orderNumber,
        transactionRef,
        rawUpiUrl: upiUri,
        qrDataUrl,
        expiresInSeconds: 300,
        sessionTimestamp: now.toISOString(),
        intentLinks: {
          ...intentLinks,
          qrDataUrl,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Dynamic QR generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate dynamic payment options: " + (error?.message || "") },
      { status: 500 }
    );
  }
}
