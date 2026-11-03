import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        minimumOrderMinor: true,
        maximumDiscountMinor: true,
        freeDelivery: true,
        startsAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Error fetching public coupons:", error);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}
