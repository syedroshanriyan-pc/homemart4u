import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized: You must be signed in to delete your account." },
        { status: 401 }
      );
    }

    const userId = session.id;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && (user.role === "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Administrator and store owner accounts cannot be self-deleted for security and compliance." },
        { status: 403 }
      );
    }

    if (!user) {
      const response = NextResponse.json(
        { success: true, message: "Account has already been removed." },
        { status: 200 }
      );
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    // Atomic transaction ensuring 100% complete purge of user and all linked data
    await prisma.$transaction(async (tx) => {
      // 1. Identify all orders placed by this user
      const userOrders = await tx.order.findMany({
        where: { userId },
        select: { id: true },
      });
      const orderIds = userOrders.map((o) => o.id);

      // 2. Delete coupon redemptions for user and user's orders
      await tx.couponRedemption.deleteMany({
        where: {
          OR: [
            { userId },
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
          ],
        },
      });

      // 3. Delete reviews written by user or associated with user's orders
      await tx.review.deleteMany({
        where: {
          OR: [
            { userId },
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
          ],
        },
      });

      // 4. Delete delivery assignments associated with user's orders or where user was agent
      await tx.deliveryAssignment.deleteMany({
        where: {
          OR: [
            { agentUserId: userId },
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
          ],
        },
      });

      // 5. Delete order items and payments for user's orders
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });

        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 6. Delete all orders for user
      await tx.order.deleteMany({
        where: { userId },
      });

      // 7. Delete favorites
      await tx.favorite.deleteMany({
        where: { userId },
      });

      // 8. Delete saved addresses
      await tx.address.deleteMany({
        where: { userId },
      });

      // 9. Delete push notification subscriptions
      await tx.notificationSubscription.deleteMany({
        where: { userId },
      });

      // 10. Delete broadcasts authored by user (if any)
      await tx.notificationBroadcast.deleteMany({
        where: { createdByUserId: userId },
      });

      // 11. Delete delivery partner profile (if any)
      await tx.deliveryAgentProfile.deleteMany({
        where: { userId },
      });

      // 12. Delete audit logs where user was actor or target entity
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { actorUserId: userId },
            { entityId: userId },
          ],
        },
      });

      // 13. Permanently delete the User record itself
      await tx.user.delete({
        where: { id: userId },
      });
    });

    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated personal data have been permanently deleted from everywhere.",
    });

    // Clear session cookie immediately
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Support POST fallback for environments where DELETE method is restricted
  return DELETE(req);
}
