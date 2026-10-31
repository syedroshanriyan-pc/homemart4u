import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { homemart4uPay } from "@/lib/pay/Homemart4uPay";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin authorization required" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, utr, amountRupees, reason, evidenceRef } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

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

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "A valid reconciliation reason (minimum 5 characters) is required for audit history." },
        { status: 400 }
      );
    }

    if (!evidenceRef || evidenceRef.trim().length < 3) {
      return NextResponse.json(
        { error: "A valid bank evidence reference (e.g. statement entry, SMS ID, passbook ref) is required." },
        { status: 400 }
      );
    }

    const result = await homemart4uPay.reconcilePayment({
      orderId,
      utr: cleanUtr,
      amountMinor,
      operatorId: session.id,
      operatorName: session.name || session.mobile,
      reason: reason.trim(),
      evidenceRef: evidenceRef.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `Order #${result.orderNumber} successfully reconciled with UTR ${cleanUtr}.`,
      result,
    });
  } catch (error: any) {
    console.error("Admin reconciliation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reconcile payment" },
      { status: 400 }
    );
  }
}
