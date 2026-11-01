"use client";

import React, { useState, useEffect } from "react";
import { useRealTime } from "@/lib/useRealTime";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { FoodTypeBadge, getProductFoodType } from "@/components/ui/FoodTypeBadge";
import { useCart } from "@/context/CartContext";
import {
  Check,
  Plus,
  Minus,
  Sparkles,
  Truck,
  ShieldCheck,
  Clock,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { ProductData, ProductVariantData } from "@/components/catalog/ProductCard";

export const ProductDetailClient: React.FC<{ product: ProductData }> = ({ product }) => {
  const { addItem } = useCart();
  const [currentProduct, setCurrentProduct] = useState(product);

  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData>(
    currentProduct.variants[0] || null
  );

  useEffect(() => {
    if (!currentProduct.variants || currentProduct.variants.length === 0) return;
    setSelectedVariant((prev) => {
      if (prev && currentProduct.variants.some((v) => v.id === prev.id)) {
        return currentProduct.variants.find((v) => v.id === prev.id)!;
      }
      return currentProduct.variants[0];
    });
  }, [currentProduct.variants]);

  useRealTime({
    channels: ["catalog"],
    onRefresh: async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(product.slug)}`);
        if (res.ok) {
          const d = await res.json();
          if (d.product) {
            setCurrentProduct(d.product);
            if (selectedVariant) {
              const matched = d.product.variants?.find((v: any) => v.id === selectedVariant.id);
              if (matched) setSelectedVariant(matched);
              else if (d.product.variants?.length > 0) setSelectedVariant(d.product.variants[0]);
            }
          }
        }
      } catch {}
    },
  });

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const sellingNum = selectedVariant?.priceMinor ? Math.round(selectedVariant.priceMinor / 100) : 0;
  const variantMrp = selectedVariant?.mrpMinor ?? product.mrpMinor;
  const mrpNum = variantMrp ? Math.round(variantMrp / 100) : 0;
  const savingsRs = mrpNum > sellingNum ? mrpNum - sellingNum : 0;
  const saveTag = product.savePriceText || (savingsRs > 0 ? `Save ₹${savingsRs}` : null);

  // Customizations selection state
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.customizationGroups?.forEach((g) => {
      if (g.options.length > 0) {
        initial[g.id] = g.options[0].id;
      }
    });
    return initial;
  });

  const handleAddToCart = () => {
    if (!selectedVariant || !currentProduct.isAvailable) return;

    const chosenCustomizations: { group: string; option: string; optionId: string; priceDeltaMinor: number }[] = [];
    let deltaSum = 0;

    product.customizationGroups?.forEach((g) => {
      const optId = selectedOptions[g.id];
      const opt = g.options.find((o) => o.id === optId);
      if (opt) {
        chosenCustomizations.push({
          group: g.name,
          option: opt.name,
          optionId: opt.id,
          priceDeltaMinor: opt.priceDeltaMinor,
        });
        deltaSum += opt.priceDeltaMinor;
      }
    });

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      imageUrl: product.imageUrl || undefined,
      unitPriceMinor: selectedVariant.priceMinor + deltaSum,
      quantity,
      weightGrams: selectedVariant.quantityValue,
      isQualifyingMeat:
        product.category?.slug === "fresh-chicken" ||
        product.category?.slug === "masala-special",
      customizations: chosenCustomizations,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const isChicken =
    product.category?.slug === "fresh-chicken" ||
    product.category?.slug === "masala-special";

  // Calculate total price with customization deltas
  let totalDeltaMinor = 0;
  product.customizationGroups?.forEach((g) => {
    const optId = selectedOptions[g.id];
    const opt = g.options.find((o) => o.id === optId);
    if (opt) totalDeltaMinor += opt.priceDeltaMinor;
  });

  const unitTotalRs = selectedVariant
    ? (selectedVariant.priceMinor + totalDeltaMinor) / 100
    : 0;

  const isComingSoon = Boolean(
    product.badgeText?.toLowerCase().includes("coming soon") ||
    product.category?.slug === "fish-seafood" ||
    product.category?.slug === "fresh-mutton"
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-charcoal-400">
        <Link href="/" className="hover:text-charcoal-700">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/menu" className="hover:text-charcoal-700">Menu</Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={`/menu/${product.category.slug}`} className="hover:text-charcoal-700">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-700 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Product Imagery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-cream-100 border border-cream-200 shadow-card">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-charcoal-400">
                Image Not Available
              </div>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-xs">
                <FoodTypeBadge type={getProductFoodType(product)} showLabel={false} size="md" />
              </div>
              {isComingSoon ? (
                <span className="px-3 py-1 rounded-full bg-amber-500 text-charcoal-900 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-charcoal-900" />
                  Coming Soon
                </span>
              ) : currentProduct.isAvailable ? (
                <Badge variant="inStock" size="md">
                  In Stock &bull; Fresh Today
                </Badge>
              ) : (
                <Badge variant="outOfStock" size="md">
                  Currently Sold Out
                </Badge>
              )}
            </div>
          </div>

          {/* Freshness Features Badge List */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-cream-100/60 border border-cream-200 text-xs text-charcoal-600">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amberGold-600" />
              <span>Dressed fresh to order</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amberGold-600" />
              <span>Target ~20 min delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amberGold-600" />
              <span>Free delivery up to 3km</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero chemical preservatives</span>
            </div>
          </div>
        </div>

        {/* Right: Product Details, Variants, Customization, Add to Cart */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FoodTypeBadge type={getProductFoodType(product)} showLabel={true} size="md" />
              {product.category && (
                <span className="text-xs uppercase font-semibold text-amberGold-600 tracking-wider">
                  &bull; {product.category.name}
                </span>
              )}
              {Boolean(product.isHalal ?? isChicken) ? (
                <HalalBadge size="sm" />
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span>{product.badgeText || "Daily Essentials at Wholesale Prices"}</span>
                </span>
              )}
              {saveTag && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                  {saveTag}
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700 mt-1">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-xs sm:text-sm text-charcoal-500 mt-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Pricing Banner */}
          <div className="p-4 rounded-2xl bg-cream-100/80 border border-cream-200 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-charcoal-400 block tracking-wider">
                Today&apos;s Effective Price
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-serif text-3xl font-bold text-charcoal-700">
                  ₹{(isNaN(unitTotalRs) || !isFinite(unitTotalRs) ? 0 : unitTotalRs).toFixed(0)}
                </span>
                {mrpNum > unitTotalRs && (
                  <span className="text-sm text-charcoal-400 line-through">
                    ₹{mrpNum}
                  </span>
                )}
                <span className="text-xs text-charcoal-500">
                  / {selectedVariant?.name || "Standard"}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-charcoal-400">
              Live Mulbagal Retail Rate
            </span>
          </div>

          {/* Portion Info Banner */}
          {isChicken && (
            <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 flex items-start gap-2.5">
              <span className="font-semibold text-forest-700 mt-0.5">&bull;</span>
              <p>
                <strong>No Minimum Order:</strong> Order any quantity you need (500g, 1kg, or custom portions) with custom cutting and fast doorstep delivery.
              </p>
            </div>
          )}

          {/* Variant / Portion Selector */}
          {currentProduct.variants && currentProduct.variants.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  Select Pack / Portion
                </label>
                {selectedVariant && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Selected: {selectedVariant.name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {currentProduct.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const vPrice = Math.round(v.priceMinor / 100);
                  const vMrp = v.mrpMinor ? Math.round(v.mrpMinor / 100) : null;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-stone-900 bg-stone-900 text-white shadow-md ring-2 ring-stone-900/20"
                          : "border-cream-300 bg-white hover:border-charcoal-400 hover:bg-cream-50 text-charcoal-700 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold leading-tight">{v.name}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className={`text-sm font-bold ${isSelected ? "text-amber-300" : "text-charcoal-900"}`}>
                          ₹{vPrice}
                        </span>
                        {vMrp && vMrp > vPrice && (
                          <span className={`text-[10px] line-through ${isSelected ? "text-stone-400" : "text-charcoal-400"}`}>
                            ₹{vMrp}
                          </span>
                        )}
                      </div>
                      {v.quantityUnit && (
                        <p className={`text-[10px] mt-0.5 ${isSelected ? "text-stone-300" : "text-charcoal-500"}`}>
                          {v.quantityValue}{v.quantityUnit} net wt
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chicken Customizations (Cutting Style & Cleaning) */}
          {product.customizationGroups?.map((group) => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-500">
                  {group.name}
                </label>
                {group.isRequired && (
                  <span className="text-[10px] text-amberGold-600 font-medium">Required</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isSelected = selectedOptions[group.id] === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [group.id]: opt.id,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-amberGold-400 bg-amberGold-50/50 text-charcoal-700 font-medium ring-1 ring-amberGold-400/40"
                          : "border-cream-200 hover:border-cream-300 bg-cream-50 text-charcoal-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                            isSelected
                              ? "border-amberGold-500 bg-amberGold-500"
                              : "border-cream-300"
                          }`}
                        >
                          {isSelected && <div className="w-1 h-1 rounded-full bg-cream-50" />}
                        </div>
                        <span className="leading-snug break-words">{opt.name}</span>
                      </div>
                      {opt.priceDeltaMinor > 0 && (
                        <span className="text-amberGold-600 font-semibold text-[11px] flex-shrink-0">
                          +₹{(opt.priceDeltaMinor / 100).toFixed(0)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity and Add to Cart Row */}
          <div className="pt-4 border-t border-cream-200 space-y-4">
            <div className="flex items-center gap-4">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-cream-300 rounded-xl bg-cream-50 p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 rounded-lg text-charcoal-500 hover:bg-cream-100 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 text-xs font-bold text-charcoal-700 font-mono">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-2 rounded-lg text-charcoal-500 hover:bg-cream-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart CTA */}
              {currentProduct.isAvailable ? (
                <Button
                  variant={added ? "secondary" : "primary"}
                  size="lg"
                  onClick={handleAddToCart}
                  className="flex-1"
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 mr-2" />
                      <span>Added to Your Cart</span>
                    </>
                  ) : (
                    <>
                      <span>Add to Cart &bull; ₹{(unitTotalRs * quantity).toFixed(0)}</span>
                    </>
                  )}
                </Button>
              ) : isComingSoon ? (
                <Button
                  variant="secondary"
                  size="lg"
                  disabled
                  className="flex-1 border-amber-300 bg-amber-50 text-amber-900 font-bold opacity-90 cursor-not-allowed"
                >
                  <Clock className="w-4 h-4 mr-2 text-amber-600 inline" />
                  Coming Soon &mdash; Launching Shortly
                </Button>
              ) : (
                <Button variant="secondary" size="lg" disabled className="flex-1">
                  Product Sold Out Today
                </Button>
              )}
            </div>

            <Link href="/cart" className="block text-center text-xs font-semibold text-amberGold-600 hover:underline">
              Proceed directly to Cart & Checkout &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
