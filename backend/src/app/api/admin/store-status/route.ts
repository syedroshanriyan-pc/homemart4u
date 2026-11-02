import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const records = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["store_status", "store_open_status", "STORE_OPEN", "store_closed_message"],
        },
      },
    });

    const map = new Map(records.map((r) => [r.key, r.value]));
    const storeStatus =
      map.get("store_status") ||
      map.get("store_open_status") ||
      (map.get("STORE_OPEN") === "false" ? "CLOSED" : "OPEN");

    const storeClosedMessage =
      map.get("store_closed_message") ||
      "We're currently closed. You can browse our menu, but ordering is temporarily unavailable.";

    return NextResponse.json({
      store_status: storeStatus === "CLOSED" ? "CLOSED" : "OPEN",
      store_closed_message: storeClosedMessage,
    });
  } catch (error) {
    console.error("Store status GET error:", error);
    return NextResponse.json({ error: "Failed to load store status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { status, message } = body;

    const normalizedStatus = String(status || "").trim().toUpperCase();
    if (normalizedStatus !== "OPEN" && normalizedStatus !== "CLOSED") {
      return NextResponse.json(
        { error: "Invalid status: must be either 'OPEN' or 'CLOSED'." },
        { status: 400 }
      );
    }

    const now = new Date();
    const isClosed = normalizedStatus === "CLOSED";

    // Atomically persist store_status, store_open_status, and STORE_OPEN
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: "store_status" },
        create: { key: "store_status", value: normalizedStatus },
        update: { value: normalizedStatus, updatedAt: now },
      }),
      prisma.systemSetting.upsert({
        where: { key: "store_open_status" },
        create: { key: "store_open_status", value: normalizedStatus },
        update: { value: normalizedStatus, updatedAt: now },
      }),
      prisma.systemSetting.upsert({
        where: { key: "STORE_OPEN" },
        create: { key: "STORE_OPEN", value: isClosed ? "false" : "true" },
        update: { value: isClosed ? "false" : "true", updatedAt: now },
      }),
      ...(message !== undefined
        ? [
            prisma.systemSetting.upsert({
              where: { key: "store_closed_message" },
              create: {
                key: "store_closed_message",
                value:
                  String(message).trim() ||
                  "We're currently closed. You can browse our menu, but ordering is temporarily unavailable.",
              },
              update: {
                value:
                  String(message).trim() ||
                  "We're currently closed. You can browse our menu, but ordering is temporarily unavailable.",
                updatedAt: now,
              },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          actorUserId: session.id,
          action: isClosed ? "STORE_CLOSED" : "STORE_OPENED",
          entityType: "SETTINGS",
          entityId: "STORE_STATUS",
          metadataJson: JSON.stringify({
            status: normalizedStatus,
            message: message || undefined,
            updatedBy: session.id,
          }),
        },
      }),
    ]);

    try {
      publishEvent("admin", "STORE_STATUS_CHANGED", {
        status: normalizedStatus,
        message: message || undefined,
        timestamp: now.toISOString(),
      });
      publishEvent("customer", "STORE_STATUS_CHANGED", {
        status: normalizedStatus,
        message: message || undefined,
        timestamp: now.toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      store_status: normalizedStatus,
      store_closed_message:
        message !== undefined
          ? String(message).trim()
          : "We're currently closed. You can browse our menu, but ordering is temporarily unavailable.",
    });
  } catch (error) {
    console.error("Store status POST error:", error);
    return NextResponse.json({ error: "Failed to update store status" }, { status: 500 });
  }
}
