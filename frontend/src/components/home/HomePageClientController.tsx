"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import type { StoreProduct } from "./StorefrontView";
import { LandingBlogView } from "./LandingBlogView";
import { BookOpen, ShoppingBag, Sparkles } from "lucide-react";

const StorefrontView = dynamic(
  () => import("./StorefrontView").then((mod) => mod.StorefrontView),
  {
    loading: () => (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 text-center">
        <div className="h-64 bg-cream-100 rounded-3xl animate-pulse" />
      </div>
    ),
  }
);

interface HomePageClientControllerProps {
  products: StoreProduct[];
  categories: { id: string; name: string; slug: string; department?: string; imageUrl?: string | null }[];
}

export const HomePageClientController: React.FC<HomePageClientControllerProps> = ({
  products,
  categories,
}) => {
  const { user, loading } = useAuth();
  const [guestViewingStore, setGuestViewingStore] = useState(false);
  const [guestDept, setGuestDept] = useState<"GROCERIES" | "MEAT">("MEAT");

  // 0. Wait for session restoration to complete before deciding on storefront vs blog
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 text-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cream-100 text-charcoal-500 text-xs font-medium animate-pulse">
          <Sparkles className="w-4 h-4 text-amberGold-500" />
          <span>Restoring session...</span>
        </div>
      </div>
    );
  }

  // 1. If user is logged in, immediately show the main Storefront view (no blog/landing page needed)
  if (user) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <StorefrontView
          products={products}
          categories={categories}
        />
      </div>
    );
  }

  // 2. If user is NOT logged in:
  // Show Guest Storefront if user tapped "Order Fresh Chicken & Eggs" or "Enter Store"
  if (guestViewingStore) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <StorefrontView
          products={products}
          categories={categories}
          initialDepartment="MEAT"
          onBackToBlog={() => setGuestViewingStore(false)}
        />
      </div>
    );
  }

  // 3. Otherwise (unauthenticated visitor initial visit), show LandingBlogView
  return (
    <div>
      {/* Quick Visitor Mode Switcher Bar */}
      <div className="bg-stone-900 border-b border-stone-800 text-stone-300 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-stone-200">
              Welcome to homemart4u Mulbagal &bull; Fresh Meat &amp; Eggs
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setGuestDept("MEAT");
              setGuestViewingStore(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm transition"
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Order Fresh Cuts &amp; Eggs &rarr;</span>
          </button>
        </div>
      </div>

      <LandingBlogView
        onEnterStore={(dept) => {
          if (dept) setGuestDept(dept);
          setGuestViewingStore(true);
        }}
      />
    </div>
  );
};
