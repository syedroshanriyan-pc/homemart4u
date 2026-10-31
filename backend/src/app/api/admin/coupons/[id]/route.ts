import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: { select: { redemptions: true, orders: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon });
  } catch (error) {
    console.error("Get coupon error:", error);
    return NextResponse.json({ error: "Failed to load coupon" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const {
      code,
      type,
      value,
      minimumOrderRupees,
      maximumDiscountRupees,
      freeDelivery,
      usageLimit,
      perUserLimit,
      isActive,
      expiresInDays,
    } = body;

    const updateData: any = {};

    if (code !== undefined && code.trim()) {
      updateData.code = code.trim().toUpperCase();
    }
    if (type !== undefined) {
      updateData.type = type;
    }
    if (value !== undefined) {
      const parsedVal = parseInt(String(value), 10);
      if (!isNaN(parsedVal)) updateData.value = parsedVal;
    }
    if (minimumOrderRupees !== undefined) {
      if (minimumOrderRupees === "" || minimumOrderRupees === null) {
        updateData.minimumOrderMinor = null;
      } else {
        const parsedMin = Math.round(parseFloat(String(minimumOrderRupees)) * 100);
        if (!isNaN(parsedMin)) updateData.minimumOrderMinor = parsedMin;
      }
    }
    if (maximumDiscountRupees !== undefined) {
      if (maximumDiscountRupees === "" || maximumDiscountRupees === null) {
        updateData.maximumDiscountMinor = null;
      } else {
        const parsedMax = Math.round(parseFloat(String(maximumDiscountRupees)) * 100);
        if (!isNaN(parsedMax)) updateData.maximumDiscountMinor = parsedMax;
      }
    }
    if (freeDelivery !== undefined) {
      updateData.freeDelivery = Boolean(freeDelivery);
    }
    if (usageLimit !== undefined) {
      if (usageLimit === "" || usageLimit === null) {
        updateData.usageLimit = null;
      } else {
        const parsedLimit = parseInt(String(usageLimit), 10);
        updateData.usageLimit = !isNaN(parsedLimit) ? parsedLimit : null;
      }
    }
    if (perUserLimit !== undefined) {
      if (perUserLimit === "" || perUserLimit === null) {
        updateData.perUserLimit = 1;
      } else {
        const parsedPerUser = parseInt(String(perUserLimit), 10);
        updateData.perUserLimit = !isNaN(parsedPerUser) && parsedPerUser > 0 ? parsedPerUser : 1;
      }
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }
    if (expiresInDays !== undefined) {
      const days = parseInt(String(expiresInDays), 10);
      if (!isNaN(days) && days > 0) {
        updateData.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "COUPON_UPDATED",
        entityType: "COUPON",
        entityId: id,
        metadataJson: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    console.error("Update coupon error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Another coupon with this code already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    // Safely delete associated redemptions first if any, then the coupon
    await prisma.$transaction(async (tx) => {
      await tx.couponRedemption.deleteMany({ where: { couponId: id } });
      // Set couponId to null in orders referencing it so order history is preserved
      await tx.order.updateMany({
        where: { couponId: id },
        data: { couponId: null },
      });
      await tx.coupon.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "COUPON_DELETED",
          entityType: "COUPON",
          entityId: id,
          metadataJson: JSON.stringify({ code: coupon.code }),
        },
      });
    });

    return NextResponse.json({ success: true, message: `Coupon "${coupon.code}" deleted successfully.` });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
