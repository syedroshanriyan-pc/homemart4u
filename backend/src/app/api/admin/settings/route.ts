import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || (session.role !== "ADMIN" )) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { settings = {} } = body; // key-value map

    for (const [key, rawValue] of Object.entries(settings)) {
      if (rawValue !== null && rawValue !== undefined && typeof key === "string" && key.trim()) {
        const value = String(rawValue).trim();
        await prisma.systemSetting.upsert({
          where: { key: key.trim() },
          create: { key: key.trim(), value },
          update: { value, updatedAt: new Date() },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "SYSTEM_SETTINGS_UPDATED",
        entityType: "SETTINGS",
        entityId: "SYSTEM",
        metadataJson: JSON.stringify(settings),
      },
    });

    const updated = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
