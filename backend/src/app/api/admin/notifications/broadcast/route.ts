import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificationProvider } from "@/lib/adapters/NotificationProvider";
import { sanitizeText } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const broadcasts = await prisma.notificationBroadcast.findMany({
      orderBy: { createdAt: "desc" },
    });

    const activeSubscriberCount = await prisma.notificationSubscription.count({
      where: { isActive: true },
    });

    return NextResponse.json({ broadcasts, activeSubscriberCount });
  } catch (error) {
    console.error("Get broadcasts error:", error);
    return NextResponse.json({ error: "Failed to load broadcast history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const rawTitle = body.title;
    const rawMessage = body.message;
    const targetUrl = body.targetUrl ? sanitizeText(body.targetUrl, 250) : null;

    const title = sanitizeText(rawTitle, 120);
    const message = sanitizeText(rawMessage, 500);

    if (!title || !message) {
      return NextResponse.json(
        { error: "Notification title and message are required." },
        { status: 400 }
      );
    }

    // Fetch active subscriber endpoints/tokens
    const subscriptions = await prisma.notificationSubscription.findMany({
      where: { isActive: true },
      select: { endpointOrToken: true },
    });

    const tokens = subscriptions.map((s) => s.endpointOrToken);

    // If no web-push tokens yet, get mobile numbers of active customers
    const customerMobiles = await prisma.user.findMany({
      where: { role: "CUSTOMER", status: "ACTIVE" },
      select: { mobile: true },
    });

    const recipientList = tokens.length > 0 ? tokens : customerMobiles.map((c) => c.mobile);

    const broadcastResult = await notificationProvider.sendBroadcast({
      title,
      message,
      targetUrl: targetUrl || null,
      subscriberTokens: recipientList,
    });

    const broadcastRecord = await prisma.notificationBroadcast.create({
      data: {
        createdByUserId: session.id,
        title,
        message,
        targetUrl: targetUrl || null,
        status: "SENT",
        recipientCount: broadcastResult.recipientCount,
        successCount: broadcastResult.successCount,
        failureCount: broadcastResult.failureCount,
        completedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "NOTIFICATION_BROADCAST_SENT",
        entityType: "NOTIFICATION_BROADCAST",
        entityId: broadcastRecord.id,
        metadataJson: JSON.stringify({
          title,
          recipientCount: broadcastResult.recipientCount,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      broadcast: broadcastRecord,
      message: `Broadcast message sent to ${broadcastResult.recipientCount} active recipients.`,
    });
  } catch (error: any) {
    console.error("Broadcast notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification broadcast. " + (error?.message || "") },
      { status: 500 }
    );
  }
}
