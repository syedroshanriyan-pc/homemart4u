import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, isTrustedSsrRequest, rateLimitHeaders } from "@/lib/rate-limiter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const isSsr = isTrustedSsrRequest(req);
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`product-slug:${isSsr ? "ssr-trusted" : ip}`, {
      maxRequests: isSsr ? 2400 : 600,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many product detail requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds), ...rateLimitHeaders(rateLimit) } }
      );
    }

    const { slug } = await params;
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
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

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: "Product not found or inactive." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { product },
      { headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        ...rateLimitHeaders(rateLimit),
      } }
    );
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    return NextResponse.json(
      { error: "Failed to load product details." },
      { status: 500 }
    );
  }
}
