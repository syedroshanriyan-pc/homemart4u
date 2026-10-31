import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, mobile: true } },
        order: { select: { id: true, orderNumber: true, totalMinor: true, placedAt: true } },
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Admin reviews error:", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}
