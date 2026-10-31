import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`products:${ip}`, { maxRequests: 120, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many product requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds), ...rateLimitHeaders(rateLimit) } }
      );
    }
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const available = searchParams.get("available");

    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = {
        OR: [{ slug: category }, { id: category }],
      };
    }

    if (available === "true") {
      where.isAvailable = true;
    }

    if (search && search.trim()) {
      const sanitizedSearch = search.trim().slice(0, 100);
      where.OR = [
        { name: { contains: sanitizedSearch, mode: "insensitive" } },
        { description: { contains: sanitizedSearch, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true, department: true },
        },
        variants: {
          where: { isAvailable: true },
          orderBy: { priceMinor: "asc" },
        },
        customizationGroups: {
          orderBy: { displayOrder: "asc" },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({ products }, {
      headers: {
        "Cache-Control": search ? "public, s-maxage=10, stale-while-revalidate=30" : "public, s-maxage=60, stale-while-revalidate=120",
        ...rateLimitHeaders(rateLimit)
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to load products." },
      { status: 500 }
    );
  }
}
