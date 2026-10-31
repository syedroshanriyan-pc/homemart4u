import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const newAvailability = body.isAvailable !== undefined ? body.isAvailable : !product.isAvailable;

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { isAvailable: newAvailability },
      });

      // Sync variants as well
      await tx.productVariant.updateMany({
        where: { productId: id },
        data: { isAvailable: newAvailability },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.id,
          action: "PRODUCT_AVAILABILITY_TOGGLED",
          entityType: "PRODUCT",
          entityId: id,
          metadataJson: JSON.stringify({
            productName: product.name,
            wasAvailable: product.isAvailable,
            nowAvailable: newAvailability,
          }),
        },
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      product: updated,
      message: `Product is now ${newAvailability ? "IN STOCK" : "OUT OF STOCK"}.`,
    });
  } catch (error) {
    console.error("Toggle availability error:", error);
    return NextResponse.json({ error: "Failed to toggle product availability" }, { status: 500 });
  }
}
