import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/events";

/**
 * Strict server-side allowlist of manageable business settings.
 * Disallows arbitrary or dangerous keys.
 */
const ALLOWED_SETTING_KEYS = new Set([
  // Core business & payment settings (preserved without modification)
  "MERCHANT_UPI_VPA",
  "UPI_VPA",
  "MERCHANT_NAME",
  "UPI_MERCHANT_NAME",
  "SHOP_NAME",
  "SHOP_PHONE",
  "SHOP_EMAIL",
  "SHOP_ADDRESS",
  "DELIVERY_FEE_PAISE",
  "COD_SURCHARGE_PAISE",
  "FREE_DELIVERY_THRESHOLD_PAISE",
  "ESTIMATED_DELIVERY_MINUTES",
  "STORE_OPEN",
  "MIN_ORDER_AMOUNT_PAISE",
  "MAX_ORDER_AMOUNT_PAISE",
  "ORDER_ACCEPTANCE_ENABLED",
  "EMERGENCY_NOTICE",

  // Lowercase & operational aliases matching admin form & system schema
  "shop_name",
  "shop_phone",
  "shop_address",
  "shop_email",
  "shop_latitude",
  "shop_longitude",
  "support_phone",
  "store_opening_hours",
  "store_closing_hours",
  "store_reopening_info",
  "shop_logo_url",
  "store_status",
  "store_open_status",
  "store_closed_message",
  "order_acceptance_enabled",
  "delivery_radius_km",
  "free_delivery_radius_meters",
  "base_delivery_fee_paise",
  "delivery_rate_per_100m_paise",
  "free_delivery_threshold_paise",
  "min_order_amount_paise",
  "delivery_available",
  "cod_available",
  "cod_surcharge_paise",
  "order_instructions",
  "minimum_order_meat_grams",
  "FREE_DELIVERY_METERS",
  "DELIVERY_RATE_PER_100M_PAISE",
  "COD_FEE_PAISE",
  "MIN_QUALIFYING_MEAT_GRAMS",
  "TARGET_DELIVERY_MINUTES",
  "SHOP_LAT",
  "SHOP_LNG",
]);

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { settings = {} } = body; // key-value map

    const validEntries: [string, string][] = [];
    for (const [key, rawValue] of Object.entries(settings)) {
      const trimmedKey = typeof key === "string" ? key.trim() : "";
      if (!trimmedKey) continue;

      if (!ALLOWED_SETTING_KEYS.has(trimmedKey)) {
        return NextResponse.json(
          { error: `Setting key '${trimmedKey}' is not permitted by system allowlist.` },
          { status: 400 }
        );
      }

      // Validate shop_name as a trimmed string between 2 and 100 characters
      if (trimmedKey === "shop_name" || trimmedKey === "SHOP_NAME") {
        if (typeof rawValue !== "string") {
          return NextResponse.json(
            { error: `Invalid value for '${trimmedKey}': must be a string between 2 and 100 characters.` },
            { status: 400 }
          );
        }
        const trimmedVal = rawValue.trim();
        if (trimmedVal.length < 2 || trimmedVal.length > 100) {
          return NextResponse.json(
            { error: `Invalid value for '${trimmedKey}': must be a string between 2 and 100 characters.` },
            { status: 400 }
          );
        }
        validEntries.push([trimmedKey, trimmedVal]);
        continue;
      }

      if (rawValue !== null && rawValue !== undefined) {
        validEntries.push([trimmedKey, String(rawValue).trim()]);
      }
    }

    for (const [key, value] of validEntries) {
      await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value, updatedAt: new Date() },
      });

      // Keep aliases synchronized for cross-compatibility
      if (key === "shop_name") {
        await prisma.systemSetting.upsert({
          where: { key: "SHOP_NAME" },
          create: { key: "SHOP_NAME", value },
          update: { value, updatedAt: new Date() },
        });
      } else if (key === "SHOP_NAME") {
        await prisma.systemSetting.upsert({
          where: { key: "shop_name" },
          create: { key: "shop_name", value },
          update: { value, updatedAt: new Date() },
        });
      } else if (key === "order_acceptance_enabled") {
        await prisma.systemSetting.upsert({
          where: { key: "ORDER_ACCEPTANCE_ENABLED" },
          create: { key: "ORDER_ACCEPTANCE_ENABLED", value },
          update: { value, updatedAt: new Date() },
        });
      } else if (key === "ORDER_ACCEPTANCE_ENABLED") {
        await prisma.systemSetting.upsert({
          where: { key: "order_acceptance_enabled" },
          create: { key: "order_acceptance_enabled", value },
          update: { value, updatedAt: new Date() },
        });
      } else if (key === "store_status" || key === "store_open_status") {
        const isClosed = value === "CLOSED" || value === "false";
        await prisma.systemSetting.upsert({
          where: { key: "STORE_OPEN" },
          create: { key: "STORE_OPEN", value: isClosed ? "false" : "true" },
          update: { value: isClosed ? "false" : "true", updatedAt: new Date() },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: session.id,
        action: "SYSTEM_SETTINGS_UPDATED",
        entityType: "SETTINGS",
        entityId: "SYSTEM",
        metadataJson: JSON.stringify(Object.fromEntries(validEntries)),
      },
    });

    // Real-time dispatch to admin listeners
    try {
      publishEvent("admin", "SETTINGS_UPDATED", {
        updatedBy: session.id,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Event publish skipped:", e);
    }

    const updated = await prisma.systemSetting.findMany({ orderBy: { key: "asc" } });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
