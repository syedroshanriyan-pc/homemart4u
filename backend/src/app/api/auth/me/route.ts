import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, signJwtToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { user: null, authenticated: false },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        deliveryProfile: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { user: null, authenticated: false, error: "Account inactive or not found" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Always issue a fresh token with authoritative database role
    const token = signJwtToken({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role as any,
    });

    const response = NextResponse.json(
      {
        authenticated: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          role: user.role,
          addresses: user.addresses,
          deliveryProfile: user.deliveryProfile,
        },
      },
      { headers: NO_CACHE_HEADERS }
    );

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth verification error:", error);
    return NextResponse.json(
      { user: null, error: "Internal server error during session verification" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
