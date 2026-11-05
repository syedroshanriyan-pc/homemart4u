"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/delivery";
import {
  Search,
  Plus,
  Minus,
  Sparkles,
  Truck,
  Check,
  Tag,
  ShoppingBag,
  Milk,
  Wheat,
  Droplets,
  Flame,
  Carrot,
  Coffee,
} from "lucide-react";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { FoodTypeBadge, getProductFoodType } from "@/components/ui/FoodTypeBadge";

export interface GroceryVariant {
  id: string;
  name: string;
  priceMinor: number;
  mrpMinor?: number | null;
  quantityValue?: number;
  quantityUnit?: string;
  isAvailable: boolean;
}

export interface GroceryProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  productType: string;
  isAvailable: boolean;
  foodType?: string | null;
  isHalal?: boolean | null;
  mrpMinor?: number | null;
  savePriceText?: string | null;
  badgeText?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    department?: string;
  };
  variants: GroceryVariant[];
}

interface GroceryCatalogViewProps {
  products: GroceryProduct[];
  categories: { id: string; name: string; slug: string; imageUrl?: string | null }[];
}

export const GroceryCatalogView: React.FC<GroceryCatalogViewProps> = ({
  products,
  categories,
}) => {
  const { items, addItem, updateQuantity } = useCart();
  const [selectedCat, setSelectedCat] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  // Selected variant per product: productId -> variantId
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Filter grocery categories
  const groceryCats = useMemo(() => {
    return categories.filter((c) =>
      [
        "dairy-eggs-bread",
        "atta-rice-dal",
        "oils-ghee",
        "spices-masalas",
        "fresh-vegetables",
        "tea-beverages",
      ].includes(c.slug)
    );
  }, [categories]);

  // Filter grocery products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Must be grocery category
      const isGroceryCat = [
        "dairy-eggs-bread",
        "atta-rice-dal",
        "oils-ghee",
        "spices-masalas",
        "fresh-vegetables",
        "tea-beverages",
      ].includes(p.category?.slug);

      if (!isGroceryCat) return false;

      if (selectedCat !== "ALL" && p.category?.slug !== selectedCat) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [products, selectedCat, searchQuery]);

  const getActiveVariant = (product: GroceryProduct) => {
    const selId = selectedVariants[product.id];
    if (selId) {
      const found = product.variants.find((v) => v.id === selId);
      if (found) return found;
    }
    return product.variants[0];
  };

  const getCartQuantityForProduct = (product: GroceryProduct, variantId: string) => {
    const cartItem = items.find(
      (item) => item.productId === product.id && item.variantId === variantId
    );
    return cartItem ? cartItem.quantity : 0;
  };

  const getCartItemId = (product: GroceryProduct, variantId: string) => {
    const cartItem = items.find(
      (item) => item.productId === product.id && item.variantId === variantId
    );
    return cartItem ? cartItem.id : null;
  };

  const handleAddToCart = (product: GroceryProduct, variant: GroceryVariant) => {
    addItem({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      imageUrl: product.imageUrl || undefined,
      unitPriceMinor: variant.priceMinor,
      quantity: 1,
      isQualifyingMeat: false,
    });
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case "dairy-eggs-bread":
        return Milk;
      case "atta-rice-dal":
        return Wheat;
      case "oils-ghee":
        return Droplets;
      case "spices-masalas":
        return Flame;
      case "fresh-vegetables":
        return Carrot;
      case "tea-beverages":
        return Coffee;
      default:
        return ShoppingBag;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Hero Strip */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 shadow-card border border-emerald-600/30">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Daily Groceries &bull; homemart4u Mulbagal Fast Store</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-tight">
            Daily Essentials at Discounted Wholesale Prices
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100 font-light leading-relaxed">
            Fresh dairy, chakki atta, branded basmati rice, pure desi ghee, organic masalas, and farm vegetables delivered alongside your fresh chicken in ~20 minutes.
          </p>

          <div className="flex flex-wrap gap-3 pt-2 text-xs text-emerald-200">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              <Truck className="w-4 h-4 text-amber-300" />
              <span>Express 20-Min Doorstep Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl border border-white/10">
              <Tag className="w-4 h-4 text-emerald-300" />
              <span>Up to 30% Below MRP Daily</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Shop By Grocery Category</span>
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            {filteredProducts.length} Products
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCat("ALL")}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${selectedCat === "ALL"
              ? "bg-emerald-700 text-white shadow-emerald-700/25 ring-2 ring-emerald-500"
              : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
              }`}
          >
            All Groceries
          </button>

          {groceryCats.map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            const isSelected = selectedCat === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.slug)}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shadow-sm ${isSelected
                  ? "bg-emerald-700 text-white shadow-emerald-700/25 ring-2 ring-emerald-500"
                  : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
                  }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-emerald-600"}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search atta, basmati rice, Amul butter, milk, oils..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-stone-200 rounded-2xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition"
          />
        </div>
      </div>

      {/* Grocery Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-2">
          <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
          <h4 className="font-serif text-base font-bold text-stone-700">No Grocery Items Found</h4>
          <p className="text-xs text-stone-400">Try adjusting your category or search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {filteredProducts.map((product) => {
            const activeVariant = getActiveVariant(product);
            const cartQty = activeVariant
              ? getCartQuantityForProduct(product, activeVariant.id)
              : 0;
            const cartItemId = activeVariant
              ? getCartItemId(product, activeVariant.id)
              : null;

            // Compute realistic simulated MRP (~15-20% higher) to showcase daily discount savings
            const sellingRs = activeVariant ? Math.round(activeVariant.priceMinor / 100) : 0;
            const variantMrp = activeVariant?.mrpMinor ?? product.mrpMinor;
            const mrpRs = variantMrp ? Math.round(variantMrp / 100) : 0;
            const savingsRs = mrpRs > sellingRs ? mrpRs - sellingRs : 0;
            const saveTag = product.savePriceText || (savingsRs > 0 ? `Save ₹${savingsRs}` : null);

            return (
              <div
                key={product.id}
                className="group relative bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden p-3 sm:p-4"
              >
                {/* Image Container with Badges */}
                <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-stone-50 mb-3">
                  <ProductImage
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    department="GROCERY"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top-Right Veg / Non-Veg / Egg Badge */}
                  <div className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-md shadow-xs">
                    <FoodTypeBadge type={getProductFoodType(product)} showLabel={false} size="sm" />
                  </div>

                  {/* Savings Badge */}
                  {saveTag && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                        {saveTag}
                      </span>
                    </div>
                  )}

                  {/* 20-Min Delivery Tag */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium flex items-center gap-1">
                      <Truck className="w-2.5 h-2.5 text-amber-300" />
                      ~20 Min
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-1.5">
                    <FoodTypeBadge type={getProductFoodType(product)} showLabel={true} size="sm" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                      &bull; {product.category?.name}
                    </span>
                  </div>

                  <h4 className="font-semibold text-xs sm:text-sm text-stone-800 line-clamp-2 leading-snug">
                    {product.name}
                  </h4>

                  {/* Trust Badge: Daily Essentials at Wholesale Prices */}
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                      <span>{product.badgeText || "Daily Essentials at Wholesale Prices"}</span>
                    </span>
                  </div>

                  {/* Pack / Variant Selector Pills */}
                  {product.variants.length > 1 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {product.variants.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [product.id]: v.id,
                            }))
                          }
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${activeVariant?.id === v.id
                            ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-300"
                            : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pricing & Add To Cart Button */}
                <div className="pt-3 border-t border-stone-100 mt-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-sm sm:text-base font-bold text-stone-900">
                        ₹{sellingRs}
                      </span>
                      {mrpRs > sellingRs && (
                        <span className="font-mono text-[10px] sm:text-xs text-stone-400 line-through">
                          ₹{mrpRs}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-400 block font-mono">
                      {activeVariant?.name || "Standard"}
                    </span>
                  </div>

                  {/* Add / Stepper Button */}
                  <div>
                    {cartQty > 0 && cartItemId ? (
                      <div className="flex items-center gap-1 bg-emerald-600 text-white rounded-xl px-2 py-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItemId, -1)}
                          className="p-1 hover:bg-emerald-700 rounded-lg transition"
                          title="Decrease"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold font-mono text-xs px-1 min-w-[1.2rem] text-center">
                          {cartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(cartItemId, 1)}
                          className="p-1 hover:bg-emerald-700 rounded-lg transition"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activeVariant && handleAddToCart(product, activeVariant)}
                        disabled={!activeVariant}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-700 border-2 border-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1 disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ADD</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
