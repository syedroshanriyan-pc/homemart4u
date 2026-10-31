import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Homemart4uPayEngine } from "@/lib/pay/Homemart4uPay";
import { sendWhatsAppPaymentRequest } from "@/lib/whatsapp";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";

const payEngine = new Homemart4uPayEngine();

/**
 * POST /api/delivery/orders/[id]/collect-online
 * Doorstep dynamic QR generation for delivery agents collecting online payment for COD orders
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Delivery agent only" }, { status: 403 });
    }

    const { id } = await params;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`doorstep-qr:${session.id}:${id}:${ip}`, { maxRequests: 15, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many QR generation attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds) } }
      );
    }

    // 1. Authenticate & confirm agent assignment to order
    const order = await prisma.order.findFirst({
      where: {
        id,
        ...(session.role === "DELIVERY_AGENT"
          ? {
              deliveryAssignment: {
                agentUserId: session.id,
              },
            }
          : {}),
      },
      include: {
        user: { select: { name: true, mobile: true } },
        payment: true,
        deliveryAssignment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or not assigned to you." },
        { status: 404 }
      );
    }

    // 2. Validate order status
    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot collect payment for a cancelled order." }, { status: 400 });
    }

    if (order.status === "DELIVERED" && order.payment?.status === "COMPLETED") {
      return NextResponse.json({ error: "Order is already delivered and paid in full." }, { status: 400 });
    }

    if (order.payment?.status === "COMPLETED") {
      return NextResponse.json({ error: "Order is already marked as paid." }, { status: 400 });
    }

    // 3. Server-side authoritative amount calculation
    const amountMinor = order.totalMinor;
    if (amountMinor <= 0) {
      return NextResponse.json({ error: "Invalid order payable amount." }, { status: 400 });
    }

    // 4. Generate dynamic QR session via self-hosted Homemart4uPay engine
    const paySession = await payEngine.createPaymentSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountMinor,
      customerName: order.user?.name,
      customerMobile: order.user?.mobile,
      notes: `Doorstep payment collection for order #${order.orderNumber}`,
    });

    if (!paySession.success) {
      return NextResponse.json({ error: "Failed to generate dynamic payment QR." }, { status: 500 });
    }

    // 5. Record/update payment attempt
    const attempt = await (prisma as any).paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: "HOMEMART4U_PAY",
        providerReference: paySession.sessionId,
        amountMinor,
        currency: "INR",
        status: "PENDING",
        qrPayload: paySession.qrPayload,
        expiresAt: new Date(Date.now() + paySession.expiresInSeconds * 1000),
        initiatedBy: "DELIVERY_AGENT",
      },
    });

    // 6. Optionally dispatch WhatsApp payment link to customer
    if (order.user?.mobile) {
      try {
        await sendWhatsAppPaymentRequest(
          {
            id: order.id,
            orderNumber: order.orderNumber,
            user: order.user,
            totalMinor: order.totalMinor,
          },
          {
            amountRupees: paySession.amountRupees,
            upiUri: paySession.qrPayload,
            expiresAt: paySession.expiresAt,
          }
        );
      } catch (notifErr) {
        console.warn("[DOORSTEP_WHATSAPP_NOTICE_SKIPPED]", notifErr);
      }
    }

    // 7. Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "DELIVERY_ONLINE_QR_GENERATED",
        entityType: "ORDER",
        entityId: order.id,
        metadataJson: JSON.stringify({
          sessionId: paySession.sessionId,
          amountMinor,
          attemptId: attempt.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountMinor,
      amountRupees: paySession.amountRupees,
      qrPayload: paySession.qrPayload,
      qrCodeImage: paySession.qrCodeImage,
      sessionId: paySession.sessionId,
      intentLinks: paySession.intentLinks,
      expiresAt: paySession.expiresAt,
      expiresInSeconds: paySession.expiresInSeconds,
      status: "PENDING",
    });
  } catch (error: any) {
    console.error("Doorstep collect-online error:", error);
    return NextResponse.json({ error: "Failed to initiate online doorstep collection." }, { status: 500 });
  }
}
