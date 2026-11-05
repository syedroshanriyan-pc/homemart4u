import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_COORDINATES } from "@/lib/delivery";

/**
 * Strict public allowlist for storefront components.
 * Prevents exposing arbitrary system settings, payment credentials, or private configuration.
 */
const PUBLIC_ALLOWED_SETTING_KEYS = new Set([
  "shop_name",
  "SHOP_NAME",
  "shop_phone",
  "SHOP_PHONE",
  "shop_address",
  "SHOP_ADDRESS",
  "shop_email",
  "SHOP_EMAIL",
  "shop_latitude",
  "SHOP_LAT",
  "shop_longitude",
  "SHOP_LNG",
  "store_status",
  "store_open_status",
  "STORE_OPEN",
  "store_closed_message",
  "free_delivery_radius_meters",
  "FREE_DELIVERY_METERS",
  "delivery_rate_per_100m_paise",
  "DELIVERY_RATE_PER_100M_PAISE",
  "cod_surcharge_paise",
  "COD_FEE_PAISE",
  "minimum_order_meat_grams",
  "MIN_QUALIFYING_MEAT_GRAMS",
  "TARGET_DELIVERY_MINUTES",
  "ESTIMATED_DELIVERY_MINUTES",
  "EMERGENCY_NOTICE",
  "ORDER_ACCEPTANCE_ENABLED",
  "order_acceptance_enabled",
  "support_phone",
  "store_opening_hours",
  "store_closing_hours",
  "store_reopening_info",
  "delivery_radius_km",
  "base_delivery_fee_paise",
  "free_delivery_threshold_paise",
  "min_order_amount_paise",
  "delivery_available",
  "cod_available",
  "order_instructions",
  "shop_logo_url",
]);

export async function GET() {
  try {
    const rawSettings = await prisma.systemSetting.findMany({
      where: {
        key: { in: Array.from(PUBLIC_ALLOWED_SETTING_KEYS) },
      },
    });

    const settingsMap: Record<string, string> = {
      shop_name: "homemart4u",
      shop_phone: "+91 90355 26638",
      shop_address: "Srinivaspur Road, Mulbagal 563131",
      shop_email: "support.homemart4u@gmail.com",
      shop_latitude: String(DEFAULT_SHOP_COORDINATES.lat),
      shop_longitude: String(DEFAULT_SHOP_COORDINATES.lng),
      store_status: "OPEN",
      store_open_status: "OPEN",
      store_closed_message: "We're currently closed. You can browse our menu, but ordering is temporarily unavailable.",
      free_delivery_radius_meters: "3000",
      delivery_rate_per_100m_paise: "150",
      cod_surcharge_paise: "700",
      minimum_order_meat_grams: "1000",
    };

    rawSettings.forEach((s) => {
      if (PUBLIC_ALLOWED_SETTING_KEYS.has(s.key)) {
        settingsMap[s.key] = s.value;
        if (s.key === "shop_name" || s.key === "SHOP_NAME") {
          settingsMap.shop_name = s.value;
        }
        if (s.key === "store_status" || s.key === "store_open_status") {
          settingsMap.store_status = s.value;
          settingsMap.store_open_status = s.value;
        }
        if (s.key === "STORE_OPEN") {
          const val = s.value === "false" ? "CLOSED" : "OPEN";
          if (!settingsMap.store_status) settingsMap.store_status = val;
        }
      }
    });

    return NextResponse.json({ settings: settingsMap });
  } catch (error) {
    console.error("Public settings error:", error);
    return NextResponse.json(
      {
        settings: {
          shop_name: "homemart4u",
          shop_phone: "+91 90355 26638",
          shop_address: "Srinivaspur Road, Mulbagal 563131",
          shop_email: "support.homemart4u@gmail.com",
          store_open_status: "OPEN",
        },
      },
      { status: 200 }
    );
  }
}
