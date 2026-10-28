"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Phone, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/";
  // Strict Open-Redirect Protection: Must be a relative path, must start with a single "/",
  // and must not begin with "//" or "/\" or contain colon ":" or external protocols.
  const redirectUrl =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\") &&
    !rawRedirect.includes(":")
      ? rawRedirect
      : "/";

  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const res = await login(identifier, password);
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === "ADMIN" || res.user.role === "SUPER_ADMIN") {
        // Admins ALWAYS go to /admin unless a specific admin sub-page was requested
        if (redirectUrl && redirectUrl.startsWith("/admin")) {
          router.push(redirectUrl);
        } else {
          router.push("/admin");
        }
      } else if (res.user.role === "DELIVERY_AGENT") {
        router.push("/delivery");
      } else if (redirectUrl && redirectUrl !== "/") {
        router.push(redirectUrl);
      } else {
        router.push("/");
      }
    } else {
      setErrorMsg(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Logo size="lg" className="justify-center" />
        <h2 className="text-xl sm:text-2xl font-serif font-medium text-charcoal-700 pt-2">
          Sign In to Your Account
        </h2>
        <p className="text-xs text-charcoal-500">
          Enter your registered mobile number or email and password to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-cream-50 py-8 px-6 sm:px-10 rounded-3xl border border-cream-200 shadow-card space-y-6">

          {searchParams.get("deleted") === "true" && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your account and all associated data have been permanently deleted from the database.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-cream-100 border border-cream-300 rounded-xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 focus:outline-none p-0.5 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-charcoal-500">
            Don&apos;t have an account?{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}
              className="font-semibold text-amberGold-600 hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs text-charcoal-400 font-mono">
          Loading login...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

