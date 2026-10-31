"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { Bike, Power, LogOut, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toggling, setToggling] = useState(false);

  // Automatically attach Bearer token and credentials to all delivery fetch requests
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;

        if (urlStr.includes("/api/delivery")) {
          const token = localStorage.getItem("fc_token");
          const headers = new Headers(init?.headers);
          if (token && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
          }
          return originalFetch(input, {
            ...init,
            credentials: init?.credentials || "include",
            headers,
          });
        }
        return originalFetch(input, init);
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/delivery");
      } else if (user.role !== "DELIVERY_AGENT" && user.role !== "ADMIN") {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  const toggleAvailability = async () => {
    try {
      setToggling(true);
      const res = await fetch("/api/delivery/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !isOnline }),
      });
      if (res.ok) {
        setIsOnline(!isOnline);
      }
    } catch {
      // Silence network errors in console
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-800 text-cream-100 text-xs font-mono">
        Authenticating Delivery Fleet...
      </div>
    );
  }

  if (!user || (user.role !== "DELIVERY_AGENT" && user.role !== "ADMIN")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      {/* Administrator Direct Shortcut Bar */}
      {(user.role === "ADMIN") && (
        <div className="bg-amberGold-400 text-charcoal-900 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-50">
          <span className="flex items-center gap-1.5">
            <span>⚙️</span>
            <span>Logged in as Store Administrator. Viewing Delivery Rider Interface.</span>
          </span>
          <Link
            href="/admin"
            className="px-3 py-1 bg-charcoal-800 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
          >
            Go to Admin Dashboard &rarr;
          </Link>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-charcoal-700 text-cream-50 sticky top-0 z-40 border-b border-charcoal-600 shadow-subtle">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/delivery" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-crimson-600 flex items-center justify-center text-white">
                <Bike className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-sm text-cream-50 block leading-tight">
                  Fresh Chicken
                </span>
                <span className="text-[10px] text-amberGold-300 font-mono tracking-wider block">
                  Rider Portal
                </span>
              </div>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-charcoal-600 hover:bg-charcoal-500 text-cream-200 hover:text-white transition"
              title="Customer Storefront"
            >
              <span>Storefront</span>
            </Link>
          </div>

          {/* Right: Duty Switch & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-subtle ${
                isOnline
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  : "bg-charcoal-600 text-cream-300 hover:bg-charcoal-500"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? "ON DUTY" : "OFF DUTY"}</span>
            </button>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 text-cream-300 hover:text-white rounded-xl hover:bg-charcoal-600 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rider Status Bar */}
        <div className="bg-charcoal-800 px-4 py-1.5 border-t border-charcoal-600/50">
          <div className="max-w-2xl mx-auto flex items-center justify-between text-[11px] text-cream-300">
            <span>
              Executive: <strong className="text-white font-medium">{user.name}</strong> ({user.mobile})
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-forest-400 animate-pulse" : "bg-charcoal-400"}`} />
              {isOnline ? "Ready for assignments" : "Not receiving runs"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">
        {children}
      </main>
    </div>
  );
}
