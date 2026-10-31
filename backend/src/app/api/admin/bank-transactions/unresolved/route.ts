import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const unresolvedPayments = await prisma.payment.findMany({
      where: {
        method: { not: "COD" },
        status: { in: ["PENDING", "REQUIRES_RECONCILIATION", "OBSERVED", "EXPIRED"] },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalMinor: true,
            status: true,
            placedAt: true,
            user: { select: { name: true, mobile: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      payments: unresolvedPayments,
    });
  } catch (error: any) {
    console.error("Admin fetch unresolved payments error:", error);
    return NextResponse.json({ error: "Failed to fetch unresolved payments" }, { status: 500 });
  }
}
