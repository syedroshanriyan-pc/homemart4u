import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { orders: true },
        },
        orders: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalMinor: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Admin customers error:", error);
    return NextResponse.json({ error: "Failed to load customers" }, { status: 500 });
  }
}
