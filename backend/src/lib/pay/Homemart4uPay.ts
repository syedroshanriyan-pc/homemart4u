/**
 * Homemart4u Pay — Self-Hosted UPI Dynamic QR Payment Engine
 *
 * Owned and hosted payment engine for Homemart4u:
 * - Dynamic NPCI UPI QR code generation with exact order-associated amounts
 * - Local high-resolution QR rendering
 * - Payment session lifecycle management (CREATED, PENDING, OBSERVED, COMPLETED, FAILED, EXPIRED, REQUIRES_RECONCILIATION)
 * - Bank credit ledger reconciliation and deduplication
 * - Cryptographic webhook / event signature verification
 * - Audited manual operator reconciliation
 *
 * Zero commercial gateway dependency (No Razorpay, Cashfree, or PayU required).
 */

import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "../prisma";
import { buildUpiUri, generateUpiIntentLinks } from "../upi";

export type Homemart4uPayStatus =
  | "CREATED"
  | "PENDING"
  | "OBSERVED"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "REQUIRES_RECONCILIATION"
  | "REFUNDED";

export interface CreatePaySessionParams {
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  customerName?: string;
  customerMobile?: string;
  notes?: string;
}

export interface PaySessionResult {
  vpa?: string;
  payeeName?: string;
  success: boolean;
  sessionId: string;
  provider: string;
  providerReference: string;
  qrPayload: string;
  qrCodeImage: string;
  amountMinor: number;
  amountRupees: number;
  orderNumber: string;
  expiresInSeconds: number;
  expiresAt: string;
  status: Homemart4uPayStatus;
  intentLinks: {
    gpayUrl: string;
    phonepeUrl: string;
    paytmUrl: string;
    bhimUrl: string;
    genericUrl: string;
  };
}

export interface PayStatusResult {
  status: Homemart4uPayStatus;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  amountRupees: number;
  provider: string;
  providerReference?: string;
  upiTxnRef?: string;
  verifiedAt?: string;
  failureReason?: string;
  requiresReconciliation?: boolean;
}

export interface ReconcilePayParams {
  orderId: string;
  utr: string;
  amountMinor: number;
  operatorId: string;
  operatorName?: string;
  reason: string;
  evidenceRef: string;
}

export class Homemart4uPayEngine {
  readonly providerName = "HOMEMART4U_PAY";

  /**
   * Retrieves active merchant VPA & Name from verified SystemSettings or fallback environment
   */
  async getMerchantConfig(): Promise<{ vpa: string; payeeName: string }> {
    try {
      const records = await prisma.systemSetting.findMany({
        where: { key: { in: ["MERCHANT_UPI_VPA", "UPI_VPA", "MERCHANT_NAME", "UPI_MERCHANT_NAME"] } },
      });
      const vpa =
        records.find((r) => r.key === "MERCHANT_UPI_VPA")?.value?.trim() ||
        records.find((r) => r.key === "UPI_VPA")?.value?.trim() ||
        process.env.MERCHANT_UPI_VPA ||
        process.env.UPI_VPA ||
        "7975137618@okbizaxis";
      const payeeName =
        records.find((r) => r.key === "MERCHANT_NAME")?.value?.trim() ||
        records.find((r) => r.key === "UPI_MERCHANT_NAME")?.value?.trim() ||
        process.env.MERCHANT_NAME ||
        process.env.NEXT_PUBLIC_UPI_MERCHANT_NAME ||
        "Fresh Chicken Centre";
      return { vpa, payeeName };
    } catch {
      return {
        vpa: process.env.MERCHANT_UPI_VPA || process.env.UPI_VPA || "7975137618@okbizaxis",
        payeeName: process.env.MERCHANT_NAME || process.env.NEXT_PUBLIC_UPI_MERCHANT_NAME || "Fresh Chicken Centre",
      };
    }
  }

  /**
   * Creates or resumes an authentic, order-specific dynamic UPI QR session
   */
  async createPaymentSession(params: CreatePaySessionParams): Promise<PaySessionResult> {
    const { orderId, orderNumber, amountMinor } = params;
    const amountRupees = amountMinor / 100;
    const { vpa, payeeName } = await this.getMerchantConfig();

    const providerReference = `TR_${orderNumber}_${Date.now()}`;
    const expiresInSeconds = 300; // 5-minute validity window
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      "https://homemart4u.vercel.app";
    const callbackUrl = `${appUrl}/order-success?orderId=${orderId}&method=ONLINE`;

    const upiPayloadConfig = {
      vpa,
      payeeName,
      amountRupees,
      orderNumber,
      transactionRef: providerReference,
      note: `Payment for Order ${orderNumber}`,
      callbackUrl,
      mc: process.env.UPI_MCC || undefined,
    };

    // NPCI UPI URI with exact minor paise converted to ₹0.00
    const upiUri = buildUpiUri(upiPayloadConfig);

    // Deep link intents for mobile app invocation
    const intentLinks = generateUpiIntentLinks(upiPayloadConfig);

    // Generate crisp QR code locally with zero external network dependency
    const qrCodeImage = await QRCode.toDataURL(upiUri, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#1c1917", // Charcoal dark
        light: "#ffffff", // Pure white
      },
    });

    // Persist or renew session record atomically in database
    await prisma.payment.upsert({
      where: { orderId },
      update: {
        method: "UPI",
        status: "PENDING",
        amountMinor,
        provider: this.providerName,
        providerReference,
        qrPayload: upiUri,
        updatedAt: new Date(),
      },
      create: {
        orderId,
        method: "UPI",
        status: "PENDING",
        amountMinor,
        provider: this.providerName,
        providerReference,
        qrPayload: upiUri,
      },
    });

    return {
      success: true,
      sessionId: `SES_${orderNumber}_${Date.now()}`,
      provider: this.providerName,
      providerReference,
      qrPayload: upiUri,
      qrCodeImage,
      amountMinor,
      amountRupees,
      orderNumber,
      expiresInSeconds,
      expiresAt,
      vpa,
      payeeName,
      status: "PENDING",
      intentLinks: {
        gpayUrl: intentLinks.gpayUrl,
        phonepeUrl: intentLinks.phonepeUrl,
        paytmUrl: intentLinks.paytmUrl,
        bhimUrl: intentLinks.bhimUrl,
        genericUrl: intentLinks.genericUrl,
      },
    };
  }

  /**
   * Retrieves server-authoritative payment status and checks against bank ledger
   */
  async getPaymentStatus(orderId: string): Promise<PayStatusResult> {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      return {
        status: "FAILED",
        orderId,
        orderNumber: "",
        amountMinor: 0,
        amountRupees: 0,
        provider: this.providerName,
        failureReason: "Payment record not found.",
      };
    }

    const orderNumber = payment.order.orderNumber;
    const amountMinor = payment.amountMinor;
    const amountRupees = amountMinor / 100;

    // Check session validity window (5 minutes = 300 seconds)
    const elapsedMs = Date.now() - new Date(payment.updatedAt || payment.createdAt).getTime();
    if (payment.status === "PENDING" && elapsedMs > 300 * 1000) {
      return {
        status: "EXPIRED",
        orderId,
        orderNumber,
        amountMinor,
        amountRupees,
        provider: payment.provider,
        providerReference: payment.providerReference || undefined,
        failureReason: "Payment session has expired. Please retry with a new dynamic QR.",
      };
    }

    // Check if authentic bank credit has been matched
    if (payment.upiTxnRef) {
      const bankTx = await prisma.bankTransaction.findUnique({
        where: { utr: payment.upiTxnRef },
      });

      if (bankTx && bankTx.status === "CLAIMED" && bankTx.claimedOrderId === orderId) {
        return {
          status: "COMPLETED",
          orderId,
          orderNumber,
          amountMinor,
          amountRupees,
          provider: payment.provider,
          providerReference: payment.providerReference || bankTx.utr,
          upiTxnRef: bankTx.utr,
          verifiedAt: payment.updatedAt.toISOString(),
        };
      }
    }

    return {
      status: (payment.status as Homemart4uPayStatus) || "PENDING",
      orderId,
      orderNumber,
      amountMinor,
      amountRupees,
      provider: payment.provider,
      providerReference: payment.providerReference || undefined,
      upiTxnRef: payment.upiTxnRef || undefined,
      verifiedAt: payment.status === "COMPLETED" ? payment.updatedAt.toISOString() : undefined,
    };
  }

  /**
   * Audited manual or programmatic payment reconciliation
   * Records operator, evidence reference, and timestamps in database transaction
   */
  async reconcilePayment(params: ReconcilePayParams) {
    const { orderId, utr, amountMinor, operatorId, operatorName, reason, evidenceRef } = params;

    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new Error(`Payment record not found for orderId: ${orderId}`);
    }

    // Amount verification: Received must meet or exceed order requirement
    if (amountMinor < payment.amountMinor) {
      throw new Error(
        `Amount mismatch: Received ₹${(amountMinor / 100).toFixed(2)}, but order requires ₹${(payment.amountMinor / 100).toFixed(2)}`
      );
    }

    // Duplicate check: Ensure UTR is not already used for another order
    if (utr) {
      const duplicate = await prisma.payment.findFirst({
        where: {
          upiTxnRef: utr,
          orderId: { not: orderId },
        },
      });

      if (duplicate) {
        throw new Error(
          `Duplicate transaction reference: UTR ${utr} has already been assigned to order #${duplicate.orderId}`
        );
      }
    }

    // Execute atomic reconciliation
    return await prisma.$transaction(async (tx) => {
      // 1. Update Payment status
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          upiTxnRef: utr,
          providerReference: utr,
          updatedAt: new Date(),
        },
      });

      // 2. Update Order status
      if (payment.order.status === "PLACED") {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
          },
        });
      }

      // 3. Upsert BankTransaction record
      if (/^\d{12}$/.test(utr)) {
        await tx.bankTransaction.upsert({
          where: { utr },
          update: {
            status: "CLAIMED",
            claimedOrderId: orderId,
            claimedAt: new Date(),
          },
          create: {
            utr,
            amountMinor,
            source: "HOMEMART4U_PAY_RECONCILIATION",
            status: "CLAIMED",
            claimedOrderId: orderId,
            claimedAt: new Date(),
            rawPayload: JSON.stringify({
              operatorId,
              operatorName,
              reason,
              evidenceRef,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }

      // 4. Create immutable AuditLog entry
      await tx.auditLog.create({
        data: {
          actorUserId: operatorId,
          action: "PAYMENT_MANUALLY_RECONCILED",
          entityType: "PAYMENT",
          entityId: payment.id,
          metadataJson: JSON.stringify({
            orderNumber: payment.order.orderNumber,
            amountMinor,
            utr,
            reason,
            evidenceRef,
            operatorName,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return {
        success: true,
        orderId,
        orderNumber: payment.order.orderNumber,
        amountMinor,
        utr,
        status: "COMPLETED",
      };
    });
  }

  /**
   * Safely marks a pending payment session as EXPIRED
   */
  async expirePaymentSession(orderId: string): Promise<boolean> {
    try {
      const payment = await prisma.payment.findUnique({ where: { orderId } });
      if (payment && payment.status === "PENDING") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "EXPIRED", updatedAt: new Date() },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Constant-time HMAC-SHA256 signature verification for internal service messages
   */
  verifyServiceSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    try {
      const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const sigBuf = Buffer.from(signature, "hex");
      const expBuf = Buffer.from(expectedSignature, "hex");
      return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
      return false;
    }
  }
}

export const homemart4uPay = new Homemart4uPayEngine();
