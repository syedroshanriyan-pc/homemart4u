import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signJwtToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { sanitizeText, sanitizeMobile, sanitizeEmail, sanitizeAddress } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: max 30 registrations per minute per IP
    const rateLimit = checkRateLimit(`register:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.resetSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const body = await req.json();
    const rawName = body.name;
    const rawMobile = body.mobile;
    const rawEmail = body.email;
    const password = body.password;
    const rawAddress = body.address;

    const name = sanitizeText(rawName, 100);
    const mobile = sanitizeMobile(rawMobile);
    const email = rawEmail ? sanitizeEmail(rawEmail) : null;

    if (!name || !mobile || !password) {
      return NextResponse.json(
        { error: "A valid name, 10-digit mobile number, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check existing
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ mobile }, email ? { email } : { mobile }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this mobile number or email already exists. Please sign in with your password." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const sanitizedAddr = sanitizeAddress(rawAddress);

    const adminMobiles = (process.env.ADMIN_MOBILE || "7022461700,9844797374")
      .split(",")
      .map((m) => m.trim().replace(/\D/g, "").slice(-10));
    const role = adminMobiles.includes(mobile.slice(-10)) ? "ADMIN" : "CUSTOMER";

    const user = await prisma.user.create({
      data: {
        name,
        mobile,
        email: email || null,
        passwordHash,
        role,
        addresses: sanitizedAddr
          ? {
              create: {
                label: sanitizedAddr.label || "Home",
                addressLine: sanitizedAddr.addressLine,
                locality: sanitizedAddr.locality || "Mulbagal",
                city: sanitizedAddr.city || "Mulbagal",
                postalCode: sanitizedAddr.postalCode || "563131",
                latitude: sanitizedAddr.latitude,
                longitude: sanitizedAddr.longitude,
                isDefault: true,
              },
            }
          : undefined,
      },
      include: {
        addresses: true,
      },
    });

    const token = signJwtToken({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role: user.role as any,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        addresses: user.addresses,
      },
    });

    const isHttps = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? "none" : "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
