import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppPaymentConfirmation } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // 1. Webhook Signature Verification
    const secret =
      process.env.PAYMENT_WEBHOOK_SECRET ||
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("Payment webhook secret is not configured on the server.");
      return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 500 });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const signature =
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-razorpay-signature") ||
      req.headers.get("x-signature");

    const serverSecret = req.headers.get("x-server-secret");
    let isDirectAuthorized = false;
    if (serverSecret && process.env.AUTH_SECRET) {
      const serverBuf = Buffer.from(serverSecret);
      const authBuf = Buffer.from(process.env.AUTH_SECRET);
      if (serverBuf.length === authBuf.length && crypto.timingSafeEqual(serverBuf, authBuf)) {
        isDirectAuthorized = true;
      }
    }

    if (!isDirectAuthorized) {
      if (!signature) {
        return NextResponse.json(
          { error: "Unauthorized: Missing webhook signature" },
          { status: 401 }
        );
      }

      // Check timestamp to protect against replay attacks (within 5 minutes)
      const timestampHeader = req.headers.get("x-webhook-timestamp");
      if (timestampHeader) {
        const timestamp = parseInt(timestampHeader, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        if (isNaN(timestamp) || Math.abs(currentTime - timestamp) > 300) {
          return NextResponse.json(
            { error: "Unauthorized: Webhook timestamp expired or clock skew too high" },
            { status: 401 }
          );
        }
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    // Parse verified payload
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Extract details from either Razorpay event payload or flat body
    const rzpPayment = body.payload?.payment?.entity;
    const orderId = body.orderId || rzpPayment?.notes?.orderId || rzpPayment?.notes?.order_id;
    const orderNumber = body.orderNumber || rzpPayment?.notes?.orderNumber || rzpPayment?.notes?.order_number;
    const status = body.status || rzpPayment?.status;
    const txnRef = body.txnRef || rzpPayment?.id || body.paymentId;
    const gateway = body.gateway || "RAZORPAY";
    const event = body.event || (status === "captured" ? "payment.captured" : undefined);

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          orderId ? { orderId } : undefined,
          orderNumber ? { order: { orderNumber } } : undefined,
          txnRef ? { providerReference: txnRef } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, mobile: true } },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Idempotency: If payment is already completed, return success without re-processing
    if (payment.status === "COMPLETED") {
      return NextResponse.json({
        received: true,
        status: "COMPLETED",
        idempotent: true,
      });
    }

    // Reconcile amount if supplied in webhook (paise minor units or rupees)
    const payloadAmountMinor =
      body.amountMinor ??
      rzpPayment?.amount ??
      (body.amount != null ? Math.round(Number(body.amount) * 100) : null);

    if (payloadAmountMinor != null && payloadAmountMinor < payment.amountMinor) {
      return NextResponse.json(
        {
          error: `Payment amount mismatch: Webhook received ${payloadAmountMinor} paise, required ${payment.amountMinor} paise.`,
        },
        { status: 400 }
      );
    }

    // Reconcile currency
    const payloadCurrency = body.currency || rzpPayment?.currency;
    if (payloadCurrency && payloadCurrency.toUpperCase() !== "INR") {
      return NextResponse.json(
        { error: `Currency mismatch: Expected INR, received ${payloadCurrency}` },
        { status: 400 }
      );
    }

    // Enforce business rule: do not blindly fulfill cancelled orders
    if (payment.order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Order is cancelled. Webhook received post-cancellation flagged for reconciliation." },
        { status: 409 }
      );
    }

    // Check if txnRef has already been credited to another order
    if (txnRef) {
      const duplicateTxn = await prisma.payment.findFirst({
        where: {
          upiTxnRef: txnRef,
          orderId: { not: payment.orderId },
        },
      });
      if (duplicateTxn) {
        return NextResponse.json(
          { error: "Transaction reference is already assigned to a different order." },
          { status: 409 }
        );
      }
    }

    const isSuccess =
      status === "SUCCESS" ||
      status === "COMPLETED" ||
      event === "payment.captured" ||
      event === "PAYMENT_SUCCESS";

    const targetStatus = isSuccess ? "COMPLETED" : "FAILED";

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: targetStatus,
          upiTxnRef: txnRef || payment.upiTxnRef || `WEBHOOK_${Date.now()}`,
          providerReference: txnRef || payment.providerReference,
          updatedAt: new Date(),
        },
      });

      // Record authentic bank transaction if txnRef is provided
      if (isSuccess && txnRef && /^\d{12}$/.test(txnRef)) {
        const existingBankTx = await tx.bankTransaction.findUnique({
          where: { utr: txnRef },
        });

        if (existingBankTx && existingBankTx.claimedOrderId && existingBankTx.claimedOrderId !== payment.orderId) {
          throw new Error(`Transaction reference ${txnRef} is already claimed by order #${existingBankTx.claimedOrderId}.`);
        }

        await tx.bankTransaction.upsert({
          where: { utr: txnRef },
          update: {
            status: "CLAIMED",
            claimedOrderId: payment.orderId,
            claimedAt: new Date(),
          },
          create: {
            utr: txnRef,
            amountMinor: payment.amountMinor,
            source: gateway || "WEBHOOK",
            status: "CLAIMED",
            claimedOrderId: payment.orderId,
            claimedAt: new Date(),
            rawPayload: rawBody,
          },
        });
      }

      if (isSuccess && payment.order.status === "PLACED") {
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });
      }

      if (payment.order?.userId) {
        await tx.auditLog.create({
          data: {
            actorUserId: payment.order.userId,
            action: isSuccess ? "GATEWAY_PAYMENT_SUCCESS" : "GATEWAY_PAYMENT_FAILED",
            entityType: "PAYMENT",
            entityId: payment.id,
            metadataJson: JSON.stringify({
              gateway: gateway || "GENERIC_WEBHOOK",
              orderNumber: payment.order.orderNumber,
              amountMinor: payment.amountMinor,
              txnRef,
              event,
            }),
          },
        });
      }

      return p;
    });

    // Record webhook event for idempotency and audit
    try {
      await (prisma as any).paymentWebhookEvent.create({
        data: {
          eventId: txnRef ? `wh_${txnRef}_${targetStatus}` : `wh_${Date.now()}`,
          provider: gateway || "GATEWAY_WEBHOOK",
          eventType: event || (isSuccess ? "PAYMENT_SUCCESS" : "PAYMENT_FAILURE"),
          providerTxnRef: txnRef || null,
          processingState: "PROCESSED",
          processingOutcome: `Payment status marked ${targetStatus}`,
          deduplicationKey: txnRef ? `dedup_${txnRef}` : undefined,
          payloadJson: rawBody.slice(0, 4000),
        },
      });
    } catch (e: any) {
      console.warn("[WEBHOOK_EVENT_DEDUP_SKIPPED]", e.message);
    }

    // Trigger WhatsApp Payment Confirmation notification to customer
    if (isSuccess && payment.order?.user?.mobile) {
      try {
        await sendWhatsAppPaymentConfirmation(
          {
            id: payment.order.id,
            orderNumber: payment.order.orderNumber,
            user: payment.order.user,
          },
          {
            amountRupees: payment.amountMinor / 100,
            upiTxnRef: txnRef || undefined,
            confirmedAt: new Date(),
          }
        );
      } catch (notifErr) {
        console.warn("[WHATSAPP_CONFIRMATION_NOTICE_SKIPPED]", notifErr);
      }
    }

    return NextResponse.json({
      received: true,
      status: targetStatus,
      paymentId: updated.id,
    });
  } catch (error: any) {
    console.error("Payment webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing error: " + (error?.message || "") },
      { status: 500 }
    );
  }
}
