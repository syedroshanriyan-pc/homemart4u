import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    const isAdmin = session && (session.role === "ADMIN" );

    const body = await req.json();
    const {
      orderId,
      orderNumber,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      upiTxnRef,
      upiApp,
      method = "RAZORPAY",
      isSuccess = true,
      failureReason,
    } = body;

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          orderId ? { orderId } : undefined,
          orderNumber ? { order: { orderNumber } } : undefined,
        ].filter(Boolean) as any,
      },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Order payment record not found" }, { status: 404 });
    }

    // Verify ownership: Admin or Order Owner
    const isOwner = session && session.id === payment.order.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized access to order payment" }, { status: 403 });
    }

    // Cryptographic validation for payment confirmation
    if (isSuccess && !isAdmin) {
      const secret = process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;
      if (!secret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          { error: "Unauthorized: Valid cryptographic payment signature is required to confirm online payment." },
          { status: 401 }
        );
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      const sigBuf = Buffer.from(razorpaySignature, "hex");
      const expBuf = Buffer.from(expectedSignature, "hex");
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid cryptographic payment signature" },
          { status: 401 }
        );
      }
    }

    // For completion, ensure valid transaction reference is provided
    const txnRef = razorpayPaymentId || upiTxnRef || `pay_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
    const newStatus = isSuccess ? "COMPLETED" : "FAILED";

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          method: method || payment.method,
          provider: "RAZORPAY",
          providerReference: txnRef,
          upiTxnRef: txnRef,
          upiApp: upiApp || payment.upiApp || "RAZORPAY_GATEWAY",
          updatedAt: new Date(),
        },
      });

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
            action: isSuccess ? "RAZORPAY_PAYMENT_VERIFIED" : "RAZORPAY_PAYMENT_FAILED",
            entityType: "PAYMENT",
            entityId: payment.id,
            metadataJson: JSON.stringify({
              orderNumber: payment.order.orderNumber,
              amountMinor: payment.amountMinor,
              razorpayPaymentId: txnRef,
              razorpayOrderId,
              razorpaySignature: razorpaySignature ? "present" : "simulated",
              method,
              failureReason: !isSuccess ? failureReason : undefined,
              verifiedAt: new Date().toISOString(),
            }),
          },
        });
      }

      return p;
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      paymentId: txnRef,
      orderNumber: payment.order.orderNumber,
      orderId: payment.orderId,
      amountRupees: payment.amountMinor / 100,
      payment: updated,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Verification failed: " + (error?.message || "") }, { status: 500 });
  }
}
