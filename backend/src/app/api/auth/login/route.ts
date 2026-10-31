import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signJwtToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limiter";
import { sanitizeText } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Rate limit: max 30 login requests per minute per IP
    const rateLimit = checkRateLimit(`login:${ip}`, { maxRequests: 30, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
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
    const rawIdentifier = body.identifier;
    const password = body.password;

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: "Mobile number/email and password are required." },
        { status: 400 }
      );
    }

    const identifier = sanitizeText(rawIdentifier, 100).trim();
    // Normalize mobile for all phone formats (+91 70224 61700, 07022461700, 917022461700, 7022461700)
    const digitsOnly = identifier.replace(/\D/g, "");

    const orConditions: any[] = [
      { mobile: identifier },
      { email: { equals: identifier, mode: "insensitive" } },
    ];
    if (digitsOnly.length === 10) {
      orConditions.push({ mobile: digitsOnly });
    } else if (digitsOnly.length > 10) {
      orConditions.push({ mobile: digitsOnly.slice(-10) });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        addresses: true,
        deliveryProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your mobile/email and password." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is inactive. Please contact store administration." },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your mobile/email and password." },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
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
        deliveryProfile: user.deliveryProfile,
      },
    });

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
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
