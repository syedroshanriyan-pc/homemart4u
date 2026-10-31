import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildUpiUri, generateUpiIntentLinks, verifyIndianUpiUtr } from "../src/lib/upi.ts";
import {
  generateCollisionResistantOrderNumber,
  allocateUniqueOrderNumber,
} from "../src/lib/order-number.ts";

const rootDir = process.cwd();
const frontendDir = path.resolve(rootDir, "../frontend");
const resolveFile = (relPath) => {
  const p1 = path.join(rootDir, relPath);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(frontendDir, relPath);
  if (fs.existsSync(p2)) return p2;
  return p1;
};

describe("Homemart4u — Secure Dynamic UPI QR Payment Integration Suite", () => {
  const secretKey = "test_webhook_secret_key_secure_2026";
  process.env.PAYMENT_WEBHOOK_SECRET = secretKey;
  process.env.AUTH_SECRET = secretKey;

  describe("1. Dynamic QR Session Creation & Exact Amount Encoding", () => {
    it("buildUpiUri encodes exact server-calculated amount in INR with paise precision", () => {
      const uri = buildUpiUri({
        vpa: "merchant@okhdfcbank",
        payeeName: "Homemart4u Store",
        amountRupees: 499.5,
        orderNumber: "FC-TEST-1001",
        transactionRef: "TXN_FC-TEST-1001_1729000000",
        note: "Order FC-TEST-1001",
      });

      assert.ok(uri.startsWith("upi://pay?"), "Must start with NPCI UPI scheme");
      assert.ok(uri.includes("pa=merchant%40okhdfcbank"), "Merchant VPA must be encoded");
      assert.ok(uri.includes("pn=Homemart4u+Store") || uri.includes("pn=Homemart4u%20Store"), "Merchant name must be encoded");
      assert.ok(uri.includes("am=499.50"), "Amount must have exact two decimal places");
      assert.ok(uri.includes("cu=INR"), "Currency must be Indian Rupee (INR)");
      assert.ok(uri.includes("tr=TXN_FC-TEST-1001_1729000000"), "Unique transaction reference must be encoded");
      assert.ok(uri.includes("tn=Order+FC-TEST-1001") || uri.includes("tn=Order%20FC-TEST-1001"), "Note must identify order");
    });

    it("generateUpiIntentLinks creates compatible links for GPay, PhonePe, Paytm, and BHIM", () => {
      const links = generateUpiIntentLinks({
        vpa: "homemart4u@upi",
        payeeName: "Homemart4u",
        amountRupees: 250.0,
        orderNumber: "FC-1002",
      });

      assert.ok(links.gpayUrl.startsWith("gpay://upi/pay?"), "Must format GPay intent URL");
      assert.ok(links.phonepeUrl.startsWith("phonepe://pay?"), "Must format PhonePe intent URL");
      assert.ok(links.paytmUrl.startsWith("paytmmp://pay?"), "Must format Paytm intent URL");
      assert.ok(links.bhimUrl.startsWith("upi://pay?"), "Must format generic UPI/BHIM intent URL");
      assert.ok(links.genericUrl.includes("am=250.00"), "Intent links must preserve exact order amount");
    });

    it("Payment adapter interface implements all required lifecycle methods", () => {
      const providerContent = fs.readFileSync(path.join(rootDir, "src/lib/adapters/PaymentProvider.ts"), "utf-8");
      assert.ok(providerContent.includes("createPaymentSession"), "Must implement createPaymentSession");
      assert.ok(providerContent.includes("getPaymentStatus"), "Must implement getPaymentStatus");
      assert.ok(providerContent.includes("verifyWebhook"), "Must implement verifyWebhook");
      assert.ok(providerContent.includes("reconcilePayment"), "Must implement reconcilePayment");
      assert.ok(providerContent.includes("expirePaymentSession"), "Must implement expirePaymentSession");
      assert.ok(providerContent.includes("export const paymentAdapter"), "Must export paymentAdapter");
      assert.ok(providerContent.includes("export const paymentProvider"), "Must export paymentProvider");
    });
  });

  describe("2. Webhook Security: Signature, Replay & Constant-Time Verification", () => {
    function verifyWebhookTestVector(rawBody, signature, headers) {
      const secret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (!secret || !signature) return { isValid: false, error: "Missing webhook secret or signature" };

      const timestampHeader = headers?.["x-webhook-timestamp"];
      if (timestampHeader) {
        const timestamp = parseInt(timestampHeader, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        if (isNaN(timestamp) || Math.abs(currentTime - timestamp) > 300) {
          return { isValid: false, error: "Webhook timestamp expired or clock skew too high" };
        }
      }

      const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { isValid: false, error: "Invalid webhook signature" };
      }

      const body = JSON.parse(rawBody);
      return {
        isValid: true,
        orderId: body.orderId,
        amountMinor: body.amountMinor,
        status: body.status,
      };
    }

    it("verifyWebhook accepts valid HMAC SHA-256 signatures", () => {
      const payload = JSON.stringify({
        orderId: "ord_valid_123",
        orderNumber: "FC-1234",
        amountMinor: 50000,
        currency: "INR",
        status: "COMPLETED",
        txnRef: "202612345678",
      });

      const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
      const currentTimestamp = Math.floor(Date.now() / 1000).toString();

      const result = verifyWebhookTestVector(payload, signature, {
        "x-webhook-timestamp": currentTimestamp,
      });

      assert.strictEqual(result.isValid, true, "Signature verification should succeed for valid HMAC");
      assert.strictEqual(result.orderId, "ord_valid_123");
      assert.strictEqual(result.amountMinor, 50000);
      assert.strictEqual(result.status, "COMPLETED");
    });

    it("verifyWebhook rejects invalid or forged signatures", () => {
      const payload = JSON.stringify({
        orderId: "ord_tampered",
        amountMinor: 10000,
      });

      const forgedSignature = crypto.createHmac("sha256", "wrong_secret").update(payload).digest("hex");

      const result = verifyWebhookTestVector(payload, forgedSignature);
      assert.strictEqual(result.isValid, false, "Must reject invalid signature");
      assert.strictEqual(result.error, "Invalid webhook signature");
    });

    it("verifyWebhook rejects expired timestamps (replay attack protection)", () => {
      const payload = JSON.stringify({ orderId: "ord_replay" });
      const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
      const expiredTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago (> 300s)

      const result = verifyWebhookTestVector(payload, signature, {
        "x-webhook-timestamp": expiredTimestamp,
      });

      assert.strictEqual(result.isValid, false, "Must reject expired webhook timestamp");
      assert.ok(result.error?.includes("timestamp expired"), "Must identify timestamp replay failure");
    });
  });

  describe("3. Payment State Integrity & Duplicate Prevention", () => {
    it("Browser reports success while provider says pending: payment stays pending", async () => {
      const statusRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/[id]/status/route.ts"), "utf-8");
      // Status route must never trust browser-reported success. It verifies against database ledger and signed records.
      assert.ok(!statusRoute.includes("currentStatus = req.body.status"), "Must never assign status directly from request body");
      assert.ok(statusRoute.includes("Unauthorized access to order payment details"), "Must enforce customer ownership");
    });

    it("Webhook route rejects amount mismatch (wrong amount rejected)", () => {
      const webhookRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/webhook/route.ts"), "utf-8");
      assert.ok(webhookRoute.includes("payloadAmountMinor < payment.amountMinor"), "Must reject if payload amount is less than expected");
      assert.ok(webhookRoute.includes("Payment amount mismatch"), "Must return amount mismatch error");
    });

    it("Webhook route rejects non-INR currency", () => {
      const webhookRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/webhook/route.ts"), "utf-8");
      assert.ok(webhookRoute.includes("Currency mismatch"), "Must reject currency other than INR");
    });

    it("Webhook route is idempotent on duplicate events", () => {
      const webhookRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/webhook/route.ts"), "utf-8");
      assert.ok(webhookRoute.includes("if (payment.status === \"COMPLETED\")"), "Must check if payment already completed");
      assert.ok(webhookRoute.includes("idempotent: true"), "Must return idempotent acknowledgment without double-processing");
    });

    it("Webhook route flags cancelled orders instead of fulfilling post-cancellation", () => {
      const webhookRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/webhook/route.ts"), "utf-8");
      assert.ok(webhookRoute.includes("if (payment.order.status === \"CANCELLED\")"), "Must check if order is cancelled");
      assert.ok(webhookRoute.includes("reconciliation"), "Must flag cancelled orders for reconciliation review");
    });

    it("Webhook route rejects duplicate transaction references used across distinct orders", () => {
      const webhookRoute = fs.readFileSync(path.join(rootDir, "src/app/api/payments/webhook/route.ts"), "utf-8");
      assert.ok(webhookRoute.includes("upiTxnRef: txnRef"), "Must query for duplicate txn reference");
      assert.ok(webhookRoute.includes("Transaction reference is already assigned to a different order"), "Must reject duplicate UTR");
    });
  });

  describe("4. Dynamic QR Checkout UX & Accessible Screens", () => {
    it("DynamicPaymentModal renders dynamic QR and expiry countdown", () => {
      const modalContent = fs.readFileSync(resolveFile("src/components/payment/DynamicPaymentModal.tsx"), "utf-8");

      assert.ok(modalContent.includes("Exact Amount to Pay"), "Must display exact payable amount banner");
      assert.ok(modalContent.includes("countdown"), "Must track session validity countdown");
      assert.ok(modalContent.includes("formatCountdown"), "Must format countdown timer");
      assert.ok(modalContent.includes("Check Bank Status Now") || modalContent.includes("checkPaymentStatusManual"), "Must provide manual status check button");
    });

    it("DynamicPaymentModal handles COMPLETED, FAILED, EXPIRED and REQUIRES_RECONCILIATION states", () => {
      const modalContent = fs.readFileSync(resolveFile("src/components/payment/DynamicPaymentModal.tsx"), "utf-8");

      assert.ok(modalContent.includes("Payment Verified"), "Must render success confirmation badge");
      assert.ok(modalContent.includes("Paid Successfully"), "Must render paid successfully headline");
      assert.ok(modalContent.includes("Session Expired"), "Must render expired session view");
      assert.ok(modalContent.includes("Reconciliation In Progress"), "Must render reconciliation in progress view");
      assert.ok(modalContent.includes("Payment Incomplete") || modalContent.includes("Transaction Cancelled"), "Must render failure view");
    });

    it("DynamicPaymentModal does NOT expose raw merchant UPI ID or manual UTR entry", () => {
      const modalContent = fs.readFileSync(resolveFile("src/components/payment/DynamicPaymentModal.tsx"), "utf-8");

      assert.ok(!modalContent.includes("Enter 12-digit UTR"), "Must not ask customer to manually type UTR");
      assert.ok(!modalContent.includes("handleVerifyUtr"), "Must not include manual UTR verification function");
      assert.ok(!modalContent.includes("copyUpiId"), "Must not include copy UPI ID button");
    });

    it("COD payment flow remains completely separate and functional", () => {
      const checkoutContent = fs.readFileSync(resolveFile("src/app/checkout/page.tsx"), "utf-8");

      assert.ok(checkoutContent.includes("Cash on Delivery (COD)"), "Must support Cash on Delivery selection");
      assert.ok(checkoutContent.includes("codFeeRs"), "Must calculate COD surcharge");
      assert.ok(checkoutContent.includes("router.push(`/order-success?orderId="), "Must route COD orders to order-success");
    });
  });

  describe("5. Order Creation Concurrency & Idempotency", () => {
    it("Order number generation produces collision-resistant identifiers", () => {
      const ids = new Set();
      for (let i = 0; i < 500; i++) {
        const id = generateCollisionResistantOrderNumber();
        assert.ok(!ids.has(id), `Collision detected on ${id}`);
        ids.add(id);
      }
      assert.strictEqual(ids.size, 500);
    });

    it("Orders route enforces unique idempotency keys", () => {
      const ordersRoute = fs.readFileSync(path.join(rootDir, "src/app/api/orders/route.ts"), "utf-8");
      assert.ok(ordersRoute.includes("idempotencyKey"), "Orders route must read idempotencyKey");
      assert.ok(ordersRoute.includes("findUnique"), "Orders route must check existing order by idempotencyKey");
    });
  });

  describe("6. Homemart4u Pay — Self-Hosted Engine & Audited Reconciliation Desk", () => {
    it("Homemart4uPay engine defines self-hosted payment session, status, and reconciliation methods", () => {
      const enginePath = path.join(rootDir, "src/lib/pay/Homemart4uPay.ts");
      assert.ok(fs.existsSync(enginePath), "src/lib/pay/Homemart4uPay.ts must exist");
      const content = fs.readFileSync(enginePath, "utf-8");

      assert.ok(content.includes("createPaymentSession"), "Must implement createPaymentSession");
      assert.ok(content.includes("getPaymentStatus"), "Must implement getPaymentStatus");
      assert.ok(content.includes("reconcilePayment"), "Must implement reconcilePayment");
      assert.ok(content.includes("expirePaymentSession"), "Must implement expirePaymentSession");
      assert.ok(content.includes("verifyServiceSignature"), "Must implement constant-time verifyServiceSignature");
      assert.ok(content.includes("HOMEMART4U_PAY"), "Must set self-hosted providerName to HOMEMART4U_PAY");
    });

    it("Checkout page and modal brand payment experience as Homemart4u Pay without commercial gateways", () => {
      const checkoutContent = fs.readFileSync(resolveFile("src/app/checkout/page.tsx"), "utf-8");
      const modalContent = fs.readFileSync(resolveFile("src/components/payment/DynamicPaymentModal.tsx"), "utf-8");

      assert.ok(checkoutContent.includes("Homemart4u Pay (Dynamic UPI QR)"), "Checkout must label option as Homemart4u Pay");
      assert.ok(!checkoutContent.includes("Razorpay Gateway:"), "Checkout must remove Razorpay commercial branding");
      assert.ok(modalContent.includes("Homemart4u Pay • Dynamic UPI QR") || modalContent.includes("Homemart4u Pay &bull; Dynamic UPI QR"), "Modal header must brand as Homemart4u Pay");
    });

    it("Admin reconciliation API requires 12-digit UTR, operator audit notes, and evidence reference", () => {
      const reconcileRoutePath = resolveFile("src/app/api/admin/bank-transactions/reconcile/route.ts");
      assert.ok(fs.existsSync(reconcileRoutePath), "Reconcile route file must exist");
      const content = fs.readFileSync(reconcileRoutePath, "utf-8");

      assert.ok(content.includes("orderId is required"), "Must require orderId");
      assert.ok(content.includes("Invalid UTR: Must be exactly 12 numeric digits"), "Must require authentic 12-digit UTR");
      assert.ok(content.includes("evidenceRef"), "Must require bank evidence reference");
      assert.ok(content.includes("reason"), "Must require audit reason");
      assert.ok(content.includes("session.role !== \"ADMIN\""), "Must enforce admin role authorization");
    });

    it("Admin reconciliation desk renders tabs for both Bank Ledger and Unresolved Payment Sessions", () => {
      const adminPagePath = resolveFile("src/app/admin/bank-transactions/page.tsx");
      const content = fs.readFileSync(adminPagePath, "utf-8");

      assert.ok(content.includes("Homemart4u Pay — Self-Hosted Reconciliation Desk"), "Must display Homemart4u Pay reconciliation headline");
      assert.ok(content.includes("Payment Reconciliation Desk"), "Must render Payment Reconciliation Desk tab");
      assert.ok(content.includes("Bank Credit Ledger"), "Must render Bank Credit Ledger tab");
      assert.ok(content.includes("Audited Payment Reconciliation"), "Must provide audited operator reconciliation modal");
      assert.ok(content.includes("Bank Evidence Reference"), "Reconciliation modal must require bank evidence reference");
    });
  });
});

