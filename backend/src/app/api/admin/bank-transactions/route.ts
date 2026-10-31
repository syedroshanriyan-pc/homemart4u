import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const transactions = await prisma.bankTransaction.findMany({
      orderBy: { receivedAt: "desc" },
      include: {
        claimedOrder: {
          select: {
            id: true,
            orderNumber: true,
            totalMinor: true,
            status: true,
            user: { select: { name: true, mobile: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      transactions,
    });
  } catch (error: any) {
    console.error("Admin bank transactions fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch bank transactions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { utr, amountRupees, payeeVpa = process.env.UPI_VPA || "7975137618@okbizaxis", senderVpa, note } = body;

    const cleanUtr = String(utr || "").trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      return NextResponse.json(
        { error: "Invalid UTR: Must be exactly 12 numeric digits from bank receipt." },
        { status: 400 }
      );
    }

    const amountMinor = Math.round(parseFloat(amountRupees || "0") * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      return NextResponse.json({ error: "Invalid amount. Must be greater than ₹0." }, { status: 400 });
    }

    // Check if already exists
    const existing = await prisma.bankTransaction.findUnique({
      where: { utr: cleanUtr },
    });

    if (existing) {
      return NextResponse.json(
        { error: `UTR ${cleanUtr} already exists in bank records with status ${existing.status}.` },
        { status: 400 }
      );
    }

    const transaction = await prisma.bankTransaction.create({
      data: {
        utr: cleanUtr,
        amountMinor,
        payeeVpa,
        senderVpa: senderVpa || undefined,
        source: "ADMIN_MANUAL_ENTRY",
        status: "UNCLAIMED",
        rawPayload: JSON.stringify({
          enteredBy: session.name || session.mobile,
          note: note || "Manually recorded bank transaction",
          timestamp: new Date().toISOString(),
        }),
      },
    });

    // Auto-match if an order is actively awaiting this UTR in PENDING state
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        upiTxnRef: cleanUtr,
        status: "PENDING",
      },
      include: { order: true },
    });

    let matchedOrder: any = null;

    if (pendingPayment && amountMinor >= pendingPayment.amountMinor) {
      await prisma.$transaction(async (tx) => {
        // Claim the transaction
        await tx.bankTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "CLAIMED",
            claimedOrderId: pendingPayment.orderId,
            claimedAt: new Date(),
          },
        });

        // Mark payment as COMPLETED
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            status: "COMPLETED",
            providerReference: cleanUtr,
            updatedAt: new Date(),
          },
        });

        // Confirm order
        if (pendingPayment.order.status === "PLACED") {
          await tx.order.update({
            where: { id: pendingPayment.orderId },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
            },
          });
        }

        if (pendingPayment.order.userId) {
          await tx.auditLog.create({
            data: {
              actorUserId: pendingPayment.order.userId,
              action: "PAYMENT_AUTO_RECONCILED_WITH_BANK_RECORD",
              entityType: "PAYMENT",
              entityId: pendingPayment.id,
              metadataJson: JSON.stringify({
                orderNumber: pendingPayment.order.orderNumber,
                utr: cleanUtr,
                amountMinor,
                matchedAt: new Date().toISOString(),
              }),
            },
          });
        }
      });

      matchedOrder = {
        orderId: pendingPayment.orderId,
        orderNumber: pendingPayment.order.orderNumber,
      };
    }

    // Log admin audit
    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "ADMIN_BANK_TRANSACTION_RECORDED",
        entityType: "BANK_TRANSACTION",
        entityId: transaction.id,
        metadataJson: JSON.stringify({
          utr: cleanUtr,
          amountMinor,
          payeeVpa,
          autoMatchedOrder: matchedOrder?.orderNumber || null,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
      matchedOrder,
    });
  } catch (error: any) {
    console.error("Admin record bank transaction error:", error);
    return NextResponse.json({ error: "Failed to record bank transaction: " + error.message }, { status: 500 });
  }
}
