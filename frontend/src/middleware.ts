import { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "fc_token";

/**
 * Cryptographic HMAC-SHA256 JWT verification using Web Crypto API for Edge runtime.
 */
async function verifyJwtInEdge(
  token: string,
  secretStr: string
): Promise<{ id?: string; role?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    // Convert secret string to key
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretStr);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert base64url signature to byte buffer
    const sigBase64 = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    const rawSig = atob(sigBase64.padEnd(sigBase64.length + ((4 - (sigBase64.length % 4)) % 4), "="));
    const sigBytes = new Uint8Array(rawSig.length);
    for (let i = 0; i < rawSig.length; i++) {
      sigBytes[i] = rawSig.charCodeAt(i);
    }

    const dataBytes = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
    if (!isValid) return null;

    // Decode and validate payload
    const payloadBase64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    // Check expiration if present
    if (payload.exp && typeof payload.exp === "number") {
      if (payload.exp * 1000 < Date.now()) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const origin = req.headers.get("origin") || "";
    const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || "";
    const frontendUrl = process.env.FRONTEND_URL || "";
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
    const allowedList = [allowedOrigin, frontendUrl, ...allowedOriginsEnv.split(",")].map((s) => s.trim()).filter(Boolean);
    const authSecret = process.env.AUTH_SECRET || "fc_dev_super_secret_jwt_key_2026_mulbagal_secure";

    const isAllowedOrigin =
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin === req.nextUrl.origin ||
      (allowedOrigin && origin === allowedOrigin) ||
      (frontendUrl && origin === frontendUrl) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com") ||
      allowedList.includes(origin);

    // 0. CSRF Protection for state-changing API endpoints
    if (
      pathname.startsWith("/api/") &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !pathname.startsWith("/api/payments/webhook") && // Signature verified
      !pathname.startsWith("/api/whatsapp/webhook") // Signature verified via HMAC-SHA256
    ) {
      if (origin) {
        if (!isAllowedOrigin) {
          return NextResponse.json(
            { error: "Forbidden: Cross-site request verification failed" },
            { status: 403 }
          );
        }
      }
    }

    // Handle CORS preflight for API routes
    if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
      const preflightHeaders = new Headers();
      if (origin && isAllowedOrigin) {
        preflightHeaders.set("Access-Control-Allow-Origin", origin);
        preflightHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
        preflightHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-webhook-signature, x-razorpay-signature, x-server-secret");
        preflightHeaders.set("Access-Control-Allow-Credentials", "true");
        preflightHeaders.set("Access-Control-Max-Age", "86400");
      }
      return new NextResponse(null, { status: 204, headers: preflightHeaders });
    }

    // Cryptographically verified token retrieval (cookie or Bearer header)
    let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    const session = token ? await verifyJwtInEdge(token, authSecret) : null;

    // 1. API Route Protection: /api/admin/*
    if (pathname.startsWith("/api/admin")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized: Login required" }, { status: 401 });
      }
      if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Administrator privileges required" }, { status: 403 });
      }
    }

    // 2. API Route Protection: /api/delivery/*
    if (pathname.startsWith("/api/delivery")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized: Login required" }, { status: 401 });
      }
      if (session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
        return NextResponse.json({ error: "Forbidden: Delivery Agent privileges required" }, { status: 403 });
      }
    }

    // 3. UI Admin Portal Protection (/admin & /admin/*)
    if (pathname.startsWith("/admin")) {
      // If no token exists, redirect to login with redirect parameter
      if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      // If token exists, allow through to AdminLayout where useAuth() checks live /api/auth/me.
      // If unauthorized, AdminLayout presents the clear "Access Restricted" screen with account details
      // and a "Sign In as Admin" action instead of bouncing to home without explanation.
    }

    // 4. UI Delivery Partner Portal Protection (/delivery & /delivery/*)
    if (pathname.startsWith("/delivery")) {
      if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (session && session.role !== "DELIVERY_AGENT" && session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // 5. UI Customer Account Pages (/account & /account/*)
    if (pathname.startsWith("/account")) {
      if (!token) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    const response = NextResponse.next();

    // Attach Comprehensive Security Headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

    // Add CORS headers for API routes
    if (pathname.startsWith("/api/")) {
      if (origin && isAllowedOrigin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
    }

    return response;
  } catch (err) {
    console.error("Frontend middleware error:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - manifest.json / icon / web app images
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
