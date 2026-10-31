import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();

    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10); // 1-indexed
    const statusFilterParam = searchParams.get("status") || "ACTIVE"; // "ACTIVE" (non-cancelled), "DELIVERED", "ALL"

    // 1. Calculate boundaries for Selected Month
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    // 2. Calculate boundaries for Previous Month (for MoM tracking)
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1, 0, 0, 0, 0);
    const endOfPrevMonth = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // 3. Build order status filter
    const statusWhere: any = {};
    if (statusFilterParam === "DELIVERED") {
      statusWhere.status = "DELIVERED";
    } else if (statusFilterParam === "ACTIVE") {
      statusWhere.status = { not: "CANCELLED" };
    }

    // 4. Fetch all Categories
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        displayOrder: true,
      },
    });

    // 5. Fetch orders for selected month
    const ordersThisMonth = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...statusWhere,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                categoryId: true,
                imageUrl: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                quantityValue: true,
                quantityUnit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 6. Fetch orders for previous month for MoM comparison
    const ordersPrevMonth = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        ...statusWhere,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                categoryId: true,
              },
            },
          },
        },
      },
    });

    // 7. Calculate aggregate totals for this month
    let totalGrossRevenueMinor = 0;
    let totalItemsSold = 0;
    let totalWeightGrams = 0;
    const uniqueOrdersSet = new Set<string>();

    // Per category maps
    const categoryStats: Record<
      string,
      {
        categoryId: string;
        categoryName: string;
        categorySlug: string;
        imageUrl: string | null;
        revenueMinor: number;
        unitsSold: number;
        weightGrams: number;
        orderIds: Set<string>;
        productsMap: Record<
          string,
          {
            id: string;
            name: string;
            imageUrl: string | null;
            units: number;
            revenueMinor: number;
            weightGrams: number;
          }
        >;
      }
    > = {};

    categories.forEach((cat) => {
      categoryStats[cat.id] = {
        categoryId: cat.id,
        categoryName: cat.name,
        categorySlug: cat.slug,
        imageUrl: cat.imageUrl,
        revenueMinor: 0,
        unitsSold: 0,
        weightGrams: 0,
        orderIds: new Set<string>(),
        productsMap: {},
      };
    });

    // Fallback unassigned category bucket
    const uncategorizedKey = "UNCATEGORIZED";
    categoryStats[uncategorizedKey] = {
      categoryId: "uncategorized",
      categoryName: "Other Items",
      categorySlug: "other",
      imageUrl: null,
      revenueMinor: 0,
      unitsSold: 0,
      weightGrams: 0,
      orderIds: new Set<string>(),
      productsMap: {},
    };

    // Daily revenue matrix: Day (1..daysInMonth) -> { [categorySlug]: revenueMinor }
    const dailyBreakdown: Array<{
      day: number;
      dateStr: string;
      totalMinor: number;
      byCategory: Record<string, number>;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const catMap: Record<string, number> = {};
      categories.forEach((c) => {
        catMap[c.slug] = 0;
      });
      dailyBreakdown.push({
        day: d,
        dateStr,
        totalMinor: 0,
        byCategory: catMap,
      });
    }

    // Process orders this month
    for (const order of ordersThisMonth) {
      uniqueOrdersSet.add(order.id);
      const orderDay = new Date(order.createdAt).getDate();
      const dailyEntry = dailyBreakdown[orderDay - 1];

      for (const item of order.items) {
        const catId = item.product?.categoryId || uncategorizedKey;
        const target = categoryStats[catId] || categoryStats[uncategorizedKey];

        const itemRev = item.lineTotalMinor;
        const itemQty = item.quantity;
        const itemWeight = (item.weightGrams || item.variant?.quantityValue || 0) * itemQty;

        totalGrossRevenueMinor += itemRev;
        totalItemsSold += itemQty;
        totalWeightGrams += itemWeight;

        target.revenueMinor += itemRev;
        target.unitsSold += itemQty;
        target.weightGrams += itemWeight;
        target.orderIds.add(order.id);

        if (dailyEntry) {
          dailyEntry.totalMinor += itemRev;
          const slugKey = target.categorySlug;
          dailyEntry.byCategory[slugKey] = (dailyEntry.byCategory[slugKey] || 0) + itemRev;
        }

        // Track per-product performance within category
        const prodId = item.product?.id || item.productId;
        if (!target.productsMap[prodId]) {
          target.productsMap[prodId] = {
            id: prodId,
            name: item.productNameSnapshot || item.product?.name || "Product",
            imageUrl: item.product?.imageUrl || null,
            units: 0,
            revenueMinor: 0,
            weightGrams: 0,
          };
        }
        target.productsMap[prodId].units += itemQty;
        target.productsMap[prodId].revenueMinor += itemRev;
        target.productsMap[prodId].weightGrams += itemWeight;
      }
    }

    // Process previous month for MoM growth
    let prevTotalGrossRevenueMinor = 0;
    const prevCategoryRevenue: Record<string, number> = {};
    const prevCategoryUnits: Record<string, number> = {};

    for (const order of ordersPrevMonth) {
      for (const item of order.items) {
        const catId = item.product?.categoryId || uncategorizedKey;
        prevTotalGrossRevenueMinor += item.lineTotalMinor;
        prevCategoryRevenue[catId] = (prevCategoryRevenue[catId] || 0) + item.lineTotalMinor;
        prevCategoryUnits[catId] = (prevCategoryUnits[catId] || 0) + item.quantity;
      }
    }

    // Calculate category cards output
    const categoryRows = Object.values(categoryStats)
      .filter((c) => c.categoryId !== "uncategorized" || c.unitsSold > 0)
      .map((c) => {
        const prevRev = prevCategoryRevenue[c.categoryId] || 0;
        const prevUnits = prevCategoryUnits[c.categoryId] || 0;

        let momRevenueGrowth: number | null = null;
        if (prevRev > 0) {
          momRevenueGrowth = Math.round(((c.revenueMinor - prevRev) / prevRev) * 100);
        } else if (c.revenueMinor > 0) {
          momRevenueGrowth = 100; // New or 100% gain
        }

        const sharePercent =
          totalGrossRevenueMinor > 0
            ? Math.round((c.revenueMinor / totalGrossRevenueMinor) * 1000) / 10
            : 0;

        const avgPriceMinor =
          c.unitsSold > 0 ? Math.round(c.revenueMinor / c.unitsSold) : 0;

        // Top 5 products in category
        const topProducts = Object.values(c.productsMap)
          .sort((a, b) => b.revenueMinor - a.revenueMinor)
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            name: p.name,
            imageUrl: p.imageUrl,
            units: p.units,
            revenueMinor: p.revenueMinor,
            revenueRs: Math.round(p.revenueMinor / 100),
            weightKg: Math.round((p.weightGrams / 1000) * 10) / 10,
          }));

        return {
          categoryId: c.categoryId,
          categoryName: c.categoryName,
          categorySlug: c.categorySlug,
          imageUrl: c.imageUrl,
          revenueMinor: c.revenueMinor,
          revenueRs: Math.round(c.revenueMinor / 100),
          unitsSold: c.unitsSold,
          weightKg: Math.round((c.weightGrams / 1000) * 10) / 10,
          orderCount: c.orderIds.size,
          averageUnitPriceRs: Math.round(avgPriceMinor / 100),
          sharePercent,
          prevMonthRevenueRs: Math.round(prevRev / 100),
          prevMonthUnits: prevUnits,
          momRevenueGrowthPercent: momRevenueGrowth,
          topProducts,
        };
      })
      .sort((a, b) => b.revenueMinor - a.revenueMinor);

    // Leader and fastest growing
    const leaderCategory = categoryRows.length > 0 ? categoryRows[0] : null;
    const fastestGrowingCategory = [...categoryRows]
      .filter((c) => c.momRevenueGrowthPercent !== null)
      .sort((a, b) => (b.momRevenueGrowthPercent || 0) - (a.momRevenueGrowthPercent || 0))[0] || null;

    // Overall MoM revenue growth
    let overallMomGrowthPercent: number | null = null;
    if (prevTotalGrossRevenueMinor > 0) {
      overallMomGrowthPercent = Math.round(
        ((totalGrossRevenueMinor - prevTotalGrossRevenueMinor) / prevTotalGrossRevenueMinor) * 100
      );
    } else if (totalGrossRevenueMinor > 0) {
      overallMomGrowthPercent = 100;
    }

    // 8. 6-Month Historical Trend for Category Comparison
    const sixMonthsTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i, 1);
      const tYear = targetDate.getFullYear();
      const tMonth = targetDate.getMonth() + 1;

      const mStart = new Date(tYear, tMonth - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(tYear, tMonth, 0, 23, 59, 59, 999);

      const mOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: mStart, lte: mEnd },
          ...statusWhere,
        },
        include: {
          items: {
            include: {
              product: {
                select: { categoryId: true, category: { select: { slug: true, name: true } } },
              },
            },
          },
        },
      });

      let mTotalMinor = 0;
      let mTotalUnits = 0;
      const catBreakdown: Record<string, { name: string; revenueMinor: number; units: number }> = {};

      categories.forEach((cat) => {
        catBreakdown[cat.slug] = { name: cat.name, revenueMinor: 0, units: 0 };
      });

      for (const o of mOrders) {
        for (const item of o.items) {
          mTotalMinor += item.lineTotalMinor;
          mTotalUnits += item.quantity;
          const slug = item.product?.category?.slug;
          if (slug && catBreakdown[slug]) {
            catBreakdown[slug].revenueMinor += item.lineTotalMinor;
            catBreakdown[slug].units += item.quantity;
          }
        }
      }

      sixMonthsTrend.push({
        year: tYear,
        month: tMonth,
        label: `${MONTH_NAMES[tMonth - 1].substring(0, 3)} ${tYear}`,
        monthName: MONTH_NAMES[tMonth - 1],
        totalRevenueRs: Math.round(mTotalMinor / 100),
        totalUnits: mTotalUnits,
        categories: Object.entries(catBreakdown).map(([slug, data]) => ({
          slug,
          name: data.name,
          revenueRs: Math.round(data.revenueMinor / 100),
          units: data.units,
        })),
      });
    }

    return NextResponse.json({
      period: {
        year,
        month,
        monthName: MONTH_NAMES[month - 1],
        fullLabel: `${MONTH_NAMES[month - 1]} ${year}`,
        daysInMonth,
      },
      summary: {
        totalRevenueMinor: totalGrossRevenueMinor,
        totalRevenueRs: Math.round(totalGrossRevenueMinor / 100),
        prevTotalRevenueRs: Math.round(prevTotalGrossRevenueMinor / 100),
        overallMomGrowthPercent,
        totalUnitsSold: totalItemsSold,
        totalWeightKg: Math.round((totalWeightGrams / 1000) * 10) / 10,
        totalOrdersCount: uniqueOrdersSet.size,
        leaderCategory: leaderCategory
          ? {
              name: leaderCategory.categoryName,
              slug: leaderCategory.categorySlug,
              revenueRs: leaderCategory.revenueRs,
              sharePercent: leaderCategory.sharePercent,
            }
          : null,
        fastestGrowingCategory: fastestGrowingCategory
          ? {
              name: fastestGrowingCategory.categoryName,
              growthPercent: fastestGrowingCategory.momRevenueGrowthPercent,
            }
          : null,
      },
      categories: categoryRows,
      historicalTrend: sixMonthsTrend,
      dailyTrend: dailyBreakdown.map((d) => ({
        day: d.day,
        date: d.dateStr,
        totalRs: Math.round(d.totalMinor / 100),
        byCategoryRs: Object.fromEntries(
          Object.entries(d.byCategory).map(([slug, val]) => [slug, Math.round(val / 100)])
        ),
      })),
      allAvailableCategories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
    });
  } catch (error) {
    console.error("Monthly categories analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate monthly category tracking analytics" },
      { status: 500 }
    );
  }
}
