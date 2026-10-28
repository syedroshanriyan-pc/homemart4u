import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public read-only endpoint returning up to 5 published, active promotional cards
 * for the homepage carousel.
 * Admin metadata (createdBy, updatedBy, internal IDs, etc.) is omitted.
 */
export async function GET() {
  try {
    const now = new Date();

    const rawOffers = await prisma.offerContent.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        imageUrl: true,
        ctaLabel: true,
        ctaUrl: true,
        couponCode: true,
        priority: true,
      },
    });

    // Validate and sanitize CTA URLs (prevent open redirects / unsafe schemes)
    const offers = rawOffers.map((offer) => {
      let safeCtaUrl: string | null = null;
      if (offer.ctaUrl && typeof offer.ctaUrl === "string") {
        const trimmed = offer.ctaUrl.trim();
        // Allow relative internal paths only, starting with '/'
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("javascript:") && !trimmed.includes("data:")) {
          safeCtaUrl = trimmed;
        }
      }

      return {
        id: offer.id,
        title: offer.title,
        description: offer.description,
        type: offer.type,
        imageUrl: offer.imageUrl,
        ctaLabel: offer.ctaLabel,
        ctaUrl: safeCtaUrl,
        couponCode: offer.couponCode,
      };
    });

    return NextResponse.json(
      { offers },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch promotional offers:", error);
    return NextResponse.json(
      { offers: [] },
      { status: 200 }
    );
  }
}
