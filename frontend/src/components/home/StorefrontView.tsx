"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  Sparkles,
  Flame,
  Egg,
  Fish,
  UtensilsCrossed,
} from "lucide-react";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { PromotionalCarousel } from "./PromotionalCarousel";

export type StoreProduct = ProductData;

interface StorefrontViewProps {
  products: StoreProduct[];
  categories: { id: string; name: string; slug: string; department?: string; isComingSoon?: boolean; imageUrl?: string | null }[];
  onOpenLocation?: () => void;
  initialDepartment?: "GROCERIES" | "MEAT";
  onBackToBlog?: () => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  products,
  categories,
  onBackToBlog,
}) => {
  const [selectedSubCat, setSelectedSubCat] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Subcategories for Fresh Meat & Eggs
  const meatSubCats = [
    { name: "All Fresh Cuts & Eggs", slug: "ALL", icon: ShoppingBag, isSoon: false },
    { name: "Fresh Chicken", slug: "fresh-chicken", icon: Sparkles, isSoon: false },
    { name: "Masala & Biryani Cuts", slug: "masala-special", icon: Flame, isSoon: false },
    { name: "Desi & Farm Eggs", slug: "eggs", icon: Egg, isSoon: false },
    { name: "Coastal Fish & Seafood", slug: "fish-seafood", icon: Fish, isSoon: true },
    { name: "Fresh Goat Mutton", slug: "fresh-mutton", icon: UtensilsCrossed, isSoon: true },
  ];

  // Exclude deactivated grocery products
  const meatProducts = useMemo(() => {
    return products.filter((prod) => {
      const isGrocery =
        prod.category?.department === "GROCERY" ||
        [
          "dairy-eggs-bread",
          "atta-rice-dal",
          "oils-ghee",
          "spices-masalas",
          "fresh-vegetables",
          "tea-beverages",
        ].includes(prod.category?.slug || "");
      return !isGrocery;
    });
  }, [products]);

  // Filter products by subcategory and search query
  const filteredProducts = useMemo(() => {
    return meatProducts.filter((prod) => {
      if (selectedSubCat !== "ALL" && prod.category?.slug !== selectedSubCat) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesDesc = prod.description?.toLowerCase().includes(q);
        const matchesCat = prod.category?.name?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [meatProducts, selectedSubCat, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {onBackToBlog && (
        <div className="flex items-center justify-between bg-stone-100 border border-stone-200 px-4 py-2 rounded-2xl text-xs text-stone-600">
          <span>Viewing homemart4u Meat &amp; Egg Storefront</span>
          <button
            type="button"
            onClick={onBackToBlog}
            className="text-rose-600 font-bold hover:underline flex items-center gap-1"
          >
            <span>&larr; View Blog &amp; Story</span>
          </button>
        </div>
      )}

      {/* 1. Admin-Managed Promotional Carousel (Max 5 cards, 1-second auto-rotation) */}
      <PromotionalCarousel />

      {/* 2. Subcategory Quick Strip & Minimal Search Filter */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
              Browse Meat &amp; Egg Cuts
            </span>
            <span className="text-stone-500 font-mono text-[11px] bg-stone-100 px-2 py-0.5 rounded-md">
              {filteredProducts.length} Items Available
            </span>
          </div>

          {/* Clean search filter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search chicken, desi eggs, cuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white text-stone-900 rounded-xl text-xs border border-stone-200 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Subcategory horizontal pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {meatSubCats.map((sc) => {
            const Icon = sc.icon;
            const isSelected = selectedSubCat === sc.slug;
            return (
              <button
                key={sc.slug}
                onClick={() => setSelectedSubCat(sc.slug)}
                className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm ${
                  isSelected
                    ? "bg-rose-700 text-white ring-2 ring-rose-500 shadow-md"
                    : sc.isSoon
                    ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                    : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : sc.isSoon ? "text-amber-600" : "text-stone-500"}`} />
                <span>{sc.name}</span>
                {sc.isSoon && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950 font-extrabold uppercase ml-0.5">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Coming Soon Notice when Mutton or Fish category selected */}
      {(selectedSubCat === "fish-seafood" || selectedSubCat === "fresh-mutton") && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border-2 border-amber-300 rounded-3xl p-5 text-center space-y-1 shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-stone-900 font-extrabold text-[10px] uppercase tracking-wider">
            <span>Coming Soon to Mulbagal</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">
            {selectedSubCat === "fish-seafood" ? "Fresh Coastal Fish & Seafood" : "Daily Fresh Goat Mutton & Lamb"}
          </h3>
          <p className="text-xs text-stone-600 max-w-lg mx-auto">
            {selectedSubCat === "fish-seafood"
              ? "We are preparing our expansion into fresh coastal fish, freshwater rohu, prawns, and steaks with zero chemical preservatives. Stay tuned!"
              : "We are onboarding certified local farms for 100% Halal young goat mutton with customized curry cuts, biryani pieces, and minced keema. Stay tuned!"}
          </p>
        </div>
      )}

      {/* 4. Product Listing Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-2 shadow-sm">
          <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
          <h4 className="font-serif text-base font-bold text-stone-700">No cuts found</h4>
          <p className="text-xs text-stone-400">
            {selectedSubCat === "fish-seafood" || selectedSubCat === "fresh-mutton"
              ? "This category is currently Coming Soon. Check back soon when fresh stock arrives!"
              : "Try adjusting your search query or reset your category filter."}
          </p>
          <button
            onClick={() => {
              setSelectedSubCat("ALL");
              setSearchQuery("");
            }}
            className="text-xs font-bold text-rose-600 hover:underline pt-2 block mx-auto"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
