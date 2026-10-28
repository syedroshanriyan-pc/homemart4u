"use client";

import React, { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { Search, PackageOpen } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  department?: string;
  isComingSoon?: boolean;
  imageUrl?: string | null;
}

interface MenuClientProps {
  initialCategories: CategoryItem[];
  initialProducts: (ProductData & { category: { id?: string; name: string; slug: string; department?: string; isComingSoon?: boolean } })[];
  defaultCategorySlug?: string;
}

export const MenuClient: React.FC<MenuClientProps> = ({
  initialCategories,
  initialProducts,
  defaultCategorySlug = "ALL",
}) => {
  const searchParams = useSearchParams();
  const urlCat = searchParams.get("cat") || searchParams.get("category");
  const initialCat = urlCat || defaultCategorySlug;

  const [selectedMeatCategory, setSelectedMeatCategory] = useState<string>(initialCat);
  const [meatSearchQuery, setMeatSearchQuery] = useState("");
  const [meatInStockOnly, setMeatInStockOnly] = useState(false);

  // Meat categories only (exclude any deactivated grocery categories)
  const meatCategories = useMemo(() => {
    return initialCategories.filter(
      (c) => c.department !== "GROCERY" && !["dairy-eggs-bread", "atta-rice-dal", "oils-ghee", "spices-masalas", "fresh-vegetables", "tea-beverages"].includes(c.slug)
    );
  }, [initialCategories]);

  // Meat & Egg products
  const meatProducts = useMemo(() => {
    return initialProducts.filter(
      (p) => p.category?.department !== "GROCERY" && !["dairy-eggs-bread", "atta-rice-dal", "oils-ghee", "spices-masalas", "fresh-vegetables", "tea-beverages"].includes(p.category?.slug)
    );
  }, [initialProducts]);

  // Filtered products
  const filteredMeatProducts = useMemo(() => {
    return meatProducts.filter((product) => {
      if (selectedMeatCategory !== "ALL" && product.category?.slug !== selectedMeatCategory) {
        return false;
      }
      if (meatInStockOnly && !product.isAvailable) {
        if (selectedMeatCategory !== "fish-seafood" && selectedMeatCategory !== "fresh-mutton") {
          return false;
        }
      }
      if (meatSearchQuery.trim()) {
        const query = meatSearchQuery.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(query);
        const descMatch = product.description?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }
      return true;
    });
  }, [meatProducts, selectedMeatCategory, meatSearchQuery, meatInStockOnly]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Category Pills & Search Controls */}
      <div className="space-y-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedMeatCategory("ALL")}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedMeatCategory === "ALL"
                ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-600/25 border-2 border-rose-600"
                : "bg-white text-stone-700 hover:bg-stone-50 border-2 border-stone-200 shadow-sm"
            }`}
          >
            All Fresh Cuts &amp; Eggs
          </button>
          {meatCategories.map((cat) => {
            const isSoon = cat.isComingSoon || cat.slug === "fish-seafood" || cat.slug === "fresh-mutton";
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedMeatCategory(cat.slug)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedMeatCategory === cat.slug
                    ? isSoon
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 border-2 border-amber-500"
                      : "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-600/25 border-2 border-rose-600"
                    : isSoon
                    ? "bg-amber-50 text-amber-900 border-2 border-amber-300 hover:bg-amber-100 shadow-sm"
                    : "bg-white text-stone-700 hover:bg-stone-50 border-2 border-stone-200 shadow-sm"
                }`}
              >
                <span>{cat.name}</span>
                {isSoon && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-extrabold uppercase">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar & In-Stock Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search chicken cuts, desi eggs, farm eggs..."
              value={meatSearchQuery}
              onChange={(e) => setMeatSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-sm transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-charcoal-600 self-end sm:self-center">
            <input
              type="checkbox"
              checked={meatInStockOnly}
              onChange={(e) => setMeatInStockOnly(e.target.checked)}
              className="rounded border-cream-300 text-rose-600 focus:ring-rose-400 h-4 w-4"
            />
            <span>Show In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Coming Soon Category Notice Banner */}
      {(selectedMeatCategory === "fish-seafood" || selectedMeatCategory === "fresh-mutton") && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border-2 border-amber-300 rounded-3xl p-5 text-center space-y-1 shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-charcoal-900 font-extrabold text-[10px] uppercase tracking-wider">
            <span>Coming Soon </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900">
            {selectedMeatCategory === "fish-seafood" ? "Fresh Coastal Fish & Seafood" : "Daily Fresh Goat Mutton & Lamb"}
          </h3>
          <p className="text-xs text-stone-600 max-w-lg mx-auto">
            {selectedMeatCategory === "fish-seafood"
              ? "We are preparing our expansion into fresh coastal fish, freshwater rohu, prawns, and steaks with zero chemical preservatives. Stay tuned!"
              : "We are onboarding certified local farms for 100% Halal young goat mutton with customized curry cuts, biryani pieces, and minced keema. Stay tuned!"}
          </p>
        </div>
      )}

      {filteredMeatProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeatProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-cream-200 text-charcoal-500 flex items-center justify-center mx-auto">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-medium text-charcoal-700">
            No cuts found
          </h3>
          <p className="text-xs text-charcoal-500">
            We couldn&apos;t find any items matching your search. Try resetting filters.
          </p>
          <button
            onClick={() => {
              setSelectedMeatCategory("ALL");
              setMeatSearchQuery("");
              setMeatInStockOnly(false);
            }}
            className="text-xs font-semibold text-rose-600 hover:underline pt-2 inline-block"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
