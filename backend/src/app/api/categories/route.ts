import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, isTrustedSsrRequest, rateLimitHeaders } from "@/lib/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const isSsr = isTrustedSsrRequest(req);
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`categories:${isSsr ? "ssr-trusted" : ip}`, {
      maxRequests: isSsr ? 2400 : 600,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many category requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds), ...rateLimitHeaders(rateLimit) } }
      );
    }
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
          "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
          ...rateLimitHeaders(rateLimit),
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
