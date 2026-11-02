import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ department: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
          include: {
            _count: {
              select: { products: { where: { isActive: true } } },
            },
          },
        },
        _count: {
          select: { products: { where: { isActive: true } }, children: true },
        },
      },
    });

    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=1, stale-while-revalidate=5, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to load categories." },
      { status: 500 }
    );
  }
}
