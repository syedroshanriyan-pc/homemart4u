"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import {
  LayoutDashboard,
  ShoppingBag,
  Bike,
  Package,
  Layers,
  CheckCircle2,
  DollarSign,
  Tag,
  Users,
  Star,
  Bell,
  Sparkles,
  BarChart3,
  PieChart,
  Settings,
  History,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Automatically attach Bearer token and credentials to all admin fetch requests
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

        if (urlStr.includes("/api/admin")) {
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
      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      if (!user && !token) {
        router.push("/login?redirect=/admin");
      } else if (user && user.role !== "ADMIN") {
        router.push("/");
      }
    }
  }, [user, loading, router]);

  const hasToken = typeof window !== "undefined" ? !!localStorage.getItem("fc_token") : false;

  if (loading || (!user && hasToken)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-700 text-cream-100 text-xs font-mono">
        Verifying administrative authorization...
      </div>
    );
  }

  if (!user || (user.role !== "ADMIN")) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Delivery Agents", href: "/admin/delivery", icon: Bike },
    { label: "Products Catalog", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Inventory Stock", href: "/admin/inventory", icon: CheckCircle2 },
    { label: "Daily Pricing", href: "/admin/pricing", icon: DollarSign },
    { label: "Coupons & Codes", href: "/admin/coupons", icon: Tag },
    { label: "Offers & Carousel CMS", href: "/admin/content", icon: Sparkles },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Review Moderation", href: "/admin/reviews", icon: Star },
    { label: "Operational Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Category Tracking", href: "/admin/analytics/categories", icon: PieChart },
    { label: "Shop Settings", href: "/admin/settings", icon: Settings },
    { label: "Audit Logs", href: "/admin/audit", icon: History },
  ];

  return (
    <div className="min-h-screen bg-cream-100/60 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-charcoal-600 border-r border-charcoal-500 text-cream-50 flex-shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-charcoal-500">
          <Logo variant="light" size="sm" />
          <span className="block mt-2 text-[10px] font-mono tracking-widest text-amberGold-300 uppercase">
            Operations Portal &bull; {user.role}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : item.href === "/admin/analytics"
                ? pathname === "/admin/analytics"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-amberGold-500 text-charcoal-800 font-semibold shadow-subtle"
                    : "text-cream-200/80 hover:bg-charcoal-500 hover:text-cream-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-charcoal-800" : "text-amberGold-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-charcoal-500 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-cream-300 hover:bg-charcoal-500 hover:text-cream-50 transition-colors"
          >
            <span>Customer Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-cream-50 border-b border-cream-200 flex items-center justify-between px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-charcoal-600 hover:bg-cream-100 transition"
              aria-label="Open Admin Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-sm font-semibold text-charcoal-700 hidden sm:block">
              Fresh Chicken Operating Center
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Customer Storefront Link - Always accessible on mobile & desktop */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-charcoal-700 hover:bg-black text-cream-50 transition shadow-subtle"
              title="Switch to Customer Storefront"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amberGold-400 shrink-0" />
              <span>Customer Website</span>
            </Link>

            {/* Direct Mobile & Desktop Sign Out Button */}
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-crimson-600 hover:bg-crimson-50 border border-crimson-200 transition"
              title="Sign Out of Admin"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Sign Out</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-cream-200">
              <div className="w-7 h-7 rounded-full bg-charcoal-500 text-cream-50 text-xs font-bold flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-charcoal-700 hidden md:inline">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Modal */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-charcoal-700/60 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-charcoal-600 text-cream-50 flex flex-col p-4 z-10 space-y-3 h-full">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal-500 flex-shrink-0">
                <Logo variant="light" size="sm" />
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-charcoal-500 text-cream-200 transition"
                  aria-label="Close Admin Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <span className="text-[10px] font-mono tracking-widest text-amberGold-300 uppercase px-1">
                Operations Menu
              </span>

              <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-cream-200 hover:bg-charcoal-500 transition"
                  >
                    <item.icon className="w-4 h-4 text-amberGold-400 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>

              {/* Mobile Drawer Footer Actions: Customer Website & Sign Out */}
              <div className="pt-3 border-t border-charcoal-500 space-y-2 flex-shrink-0">
                <Link
                  href="/"
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-cream-50 bg-charcoal-500 hover:bg-charcoal-400 transition"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-amberGold-400" />
                    <span>Go to Customer Website</span>
                  </span>
                  <span className="text-[10px] text-amberGold-300 font-mono">&rarr;</span>
                </Link>

                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    logout();
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-crimson-400 hover:bg-crimson-950/40 border border-crimson-900/50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Admin</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
