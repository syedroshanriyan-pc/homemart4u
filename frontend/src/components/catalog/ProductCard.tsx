"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { FoodTypeBadge, getProductFoodType } from "@/components/ui/FoodTypeBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Heart, Plus, Check, SlidersHorizontal, AlertCircle, Sparkles, Clock } from "lucide-react";

export interface ProductVariantData {
  id: string;
  name: string;
  pricingType: string;
  quantityValue: number;
  quantityUnit: string;
  priceMinor: number;
  mrpMinor?: number | null;
  isAvailable: boolean;
}

export interface CustomizationOptionData {
  id: string;
  name: string;
  priceDeltaMinor: number;
  isActive: boolean;
}

export interface CustomizationGroupData {
  id: string;
  name: string;
  selectionType: string;
  isRequired: boolean;
  options: CustomizationOptionData[];
}

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  productType: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  foodType?: string | null;
  isHalal?: boolean | null;
  mrpMinor?: number | null;
  savePriceText?: string | null;
  badgeText?: string | null;
  category?: { name: string; slug: string; department?: string };
  variants: ProductVariantData[];
  customizationGroups?: CustomizationGroupData[];
}

export const ProductCard: React.FC<{
  product: ProductData;
  isFavoriteInitial?: boolean;
}> = ({ product, isFavoriteInitial = false }) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(isFavoriteInitial);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData>(
    product.variants[0] || null
  );

  useEffect(() => {
    if (!product.variants || product.variants.length === 0) return;
    setSelectedVariant((prev) => {
      if (prev && product.variants.some((v) => v.id === prev.id)) {
        return product.variants.find((v) => v.id === prev.id)!;
      }
      return product.variants[0];
    });
  }, [product.variants]);

  // Selected customizations: map of groupId -> array of optionIds
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    product.customizationGroups?.forEach((g) => {
      if (g.isRequired && g.selectionType === "SINGLE" && g.options.length > 0) {
        initial[g.id] = [g.options[0].id];
      } else {
        initial[g.id] = [];
      }
    });
    return initial;
  });

  const toggleModalOption = (groupId: string, optionId: string, selectionType: string) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (selectionType === "SINGLE") {
        return { ...prev, [groupId]: [optionId] };
      } else {
        const exists = current.includes(optionId);
        return {
          ...prev,
          [groupId]: exists ? current.filter((id) => id !== optionId) : [...current, optionId],
        };
      }
    });
  };

  const [addedAnimation, setAddedAnimation] = useState(false);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    try {
      await fetch(`/api/me/favorites/${product.id}`, {
        method: nextState ? "POST" : "DELETE",
      });
    } catch {}
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.isAvailable || !selectedVariant?.isAvailable) return;

    // If product has required customizations, open customization modal
    if (product.customizationGroups && product.customizationGroups.length > 0) {
      setIsCustomizeOpen(true);
      return;
    }

    // Direct add selected variant
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      imageUrl: product.imageUrl || undefined,
      unitPriceMinor: selectedVariant.priceMinor,
      quantity: 1,
      weightGrams: selectedVariant.quantityValue,
      isQualifyingMeat:
        product.category?.slug === "fresh-chicken" ||
        product.category?.slug === "masala-special",
    });

    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const handleConfirmCustomize = () => {
    if (!selectedVariant) return;

    // Validate required customization groups
    const missingGroup = (product.customizationGroups || []).find(
      (g) => g.isRequired && (!selectedOptions[g.id] || selectedOptions[g.id].length === 0)
    );
    if (missingGroup) {
      alert(`Please select your preference for "${missingGroup.name}".`);
      return;
    }

    const chosenCustomizations: { group: string; option: string; optionId: string; priceDeltaMinor: number }[] = [];
    let deltaSum = 0;

    product.customizationGroups?.forEach((g) => {
      const optIds = selectedOptions[g.id] || [];
      optIds.forEach((optId) => {
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
    });

    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.name,
      imageUrl: product.imageUrl || undefined,
      unitPriceMinor: selectedVariant.priceMinor + deltaSum,
      quantity: 1,
      weightGrams: selectedVariant.quantityValue,
      isQualifyingMeat:
        product.category?.slug === "fresh-chicken" ||
        product.category?.slug === "masala-special",
      customizations: chosenCustomizations,
    });

    setIsCustomizeOpen(false);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
  };

  const sellingNum = selectedVariant?.priceMinor ? Math.round(selectedVariant.priceMinor / 100) : 0;
  const variantMrp = selectedVariant?.mrpMinor ?? product.mrpMinor;
  const mrpNum = variantMrp ? Math.round(variantMrp / 100) : 0;
  const savingsRs = mrpNum > sellingNum ? mrpNum - sellingNum : 0;
  const saveTag = product.savePriceText || (savingsRs > 0 ? `Save ₹${savingsRs}` : null);

  const primaryPrice = selectedVariant?.priceMinor
    ? (selectedVariant.priceMinor / 100).toFixed(0)
    : "0";

  const isComingSoon = Boolean(
    product.badgeText?.toLowerCase().includes("coming soon") ||
    product.category?.slug === "fish-seafood" ||
    product.category?.slug === "fresh-mutton"
  );

  return (
    <>
      <div className="group relative flex flex-col bg-cream-50 rounded-2xl border border-cream-200 overflow-hidden hover:border-cream-300 hover:shadow-card transition-all duration-300">
        {/* Favorite Button (Positioned over image outside Link) */}
        {user && (
          <button
            type="button"
            onClick={toggleFavorite}
            className={`absolute top-3 right-3 z-20 p-2 rounded-xl backdrop-blur-md transition-all ${
              isFavorite
                ? "bg-red-50 text-red-600 shadow-sm"
                : "bg-charcoal-700/30 text-cream-50 hover:bg-charcoal-700/50"
            }`}
            aria-label="Add to favorites"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
        )}
        {/* Product Image & Badges */}
        <Link href={`/product/${product.slug}`} className="relative aspect-[4/3] w-full overflow-hidden bg-cream-100 block">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-charcoal-400 text-xs">
              No Image
            </div>
          )}

          {/* Availability & Halal & Save Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-xs">
              <FoodTypeBadge type={getProductFoodType(product)} showLabel={false} size="sm" />
              {isComingSoon ? (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-charcoal-900 text-[10px] font-black uppercase tracking-wider shadow">
                  Coming Soon
                </span>
              ) : product.isAvailable ? (
                <Badge variant="inStock" size="sm">
                  In Stock
                </Badge>
              ) : (
                <Badge variant="outOfStock" size="sm">
                  Out of Stock
                </Badge>
              )}
            </div>
            {saveTag && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                {saveTag}
              </span>
            )}
          </div>

          

          {/* Category Pill */}
          {product.category && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-charcoal-700/70 text-cream-100 backdrop-blur-md">
                {product.category.name}
              </span>
            </div>
          )}
        </Link>

        {/* Content & Pricing */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FoodTypeBadge type={getProductFoodType(product)} showLabel={true} size="sm" />
            </div>
            <Link href={`/product/${product.slug}`}>
              <h3 className="font-serif text-base sm:text-lg font-medium text-charcoal-600 group-hover:text-amberGold-600 transition-colors line-clamp-1">
                {product.name}
              </h3>
            </Link>
            {product.description && (
              <p className="text-xs text-charcoal-500 mt-1 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Tag/Badge: Halal for meat, Daily Essentials at Wholesale Prices for groceries */}
            {Boolean(product.isHalal ?? (product.category?.slug === "fresh-chicken" || product.category?.slug === "masala-special")) ? (
              <div className="mt-2">
                <HalalBadge size="sm" variant="outline" />
              </div>
            ) : (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                  <span>{product.badgeText || "Daily Essentials at Wholesale Prices"}</span>
                </span>
              </div>
            )}
          </div>

          {/* Multiple Variant Selector Chips (e.g. 500g, 1kg, 1.5kg, 2kg) */}
          {product.variants && product.variants.length > 1 ? (
            <div className="mt-3">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block mb-1">
                Select Portion:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const vPrice = Math.round(v.priceMinor / 100);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedVariant(v);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer active:scale-95 ${
                        isSelected
                          ? "bg-stone-900 border-stone-900 text-white shadow-xs"
                          : "bg-white border-cream-300 text-charcoal-700 hover:border-charcoal-400 hover:bg-cream-100"
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className={`ml-1 font-bold ${isSelected ? "text-amber-300" : "text-emerald-700"}`}>
                        ₹{vPrice}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : product.variants && product.variants.length === 1 ? (
            <div className="mt-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-cream-100 text-charcoal-600 border border-cream-200">
                Portion: {product.variants[0].name}
              </span>
            </div>
          ) : null}

          <div className="mt-4 pt-3 border-t border-cream-200 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-semibold text-charcoal-400 block tracking-wider">
                {selectedVariant?.name || "Today's Price"}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-serif font-bold text-charcoal-700">
                  ₹{primaryPrice}
                </span>
                {mrpNum > sellingNum && (
                  <span className="text-xs text-charcoal-400 line-through">
                    ₹{mrpNum}
                  </span>
                )}
                {selectedVariant && (
                  <span className="text-xs text-charcoal-400">
                    / {selectedVariant.quantityUnit === "g" ? `${selectedVariant.quantityValue}g` : selectedVariant.name}
                  </span>
                )}
              </div>
            </div>

            {/* Add to Cart CTA */}
            {product.isAvailable ? (
              <Button
                variant={addedAnimation ? "secondary" : "primary"}
                size="sm"
                onClick={handleQuickAdd}
                className="min-w-[80px]"
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </Button>
            ) : isComingSoon ? (
              <Button
                variant="secondary"
                size="sm"
                disabled
                className="min-w-[95px] border-amber-300 bg-amber-50 text-amber-800 font-bold opacity-90 cursor-not-allowed text-[11px]"
              >
                <Clock className="w-3 h-3 mr-1 inline text-amber-600" />
                Coming Soon
              </Button>
            ) : (
              <Button variant="secondary" size="sm" disabled className="min-w-[80px]">
                Sold Out
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Product Customization & Variant Modal */}
      <Modal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        title={`Customize: ${product.name}`}
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Variant Selector (if more than 1) */}
          {product.variants.length > 1 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal-500 mb-2">
                Select Portion / Variant
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVariant?.id === v.id
                        ? "border-stone-900 bg-stone-900 text-white shadow-xs ring-2 ring-stone-900/20"
                        : "border-cream-300 bg-cream-50 hover:bg-cream-100 text-charcoal-700"
                    }`}
                  >
                    <p className="text-xs font-semibold">{v.name}</p>
                    <p className={`text-xs font-bold mt-0.5 ${selectedVariant?.id === v.id ? "text-amber-300" : "text-emerald-700"}`}>
                      ₹{(v.priceMinor / 100).toFixed(0)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customization Groups */}
          {product.customizationGroups?.map((group) => {
            const isSingle = group.selectionType === "SINGLE";
            const groupSelected = selectedOptions[group.id] || [];

            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                      {group.name}
                    </label>
                    <span className="text-[10px] text-charcoal-400 ml-1.5">
                      {isSingle ? "(Select one)" : "(Multiple allowed)"}
                    </span>
                  </div>
                  {group.isRequired && (
                    <span className="text-[10px] text-amberGold-600 font-bold uppercase tracking-wider">Required</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {group.options.map((opt) => {
                    const isSelected = groupSelected.includes(opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => toggleModalOption(group.id, opt.id, group.selectionType)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? "border-stone-900 bg-stone-900 text-white font-medium ring-1 ring-stone-900"
                            : "border-cream-200 hover:border-cream-300 bg-cream-50 text-charcoal-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <div
                            className={`w-4 h-4 rounded-${isSingle ? "full" : "md"} border flex-shrink-0 flex items-center justify-center ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-500 text-cream-50"
                                : "border-cream-300"
                            }`}
                          >
                            {isSelected && (isSingle ? <div className="w-1.5 h-1.5 rounded-full bg-cream-50" /> : <Check className="w-2.5 h-2.5 stroke-[3]" />)}
                          </div>
                          <span className="leading-snug break-words">{opt.name}</span>
                        </div>
                        {opt.priceDeltaMinor > 0 && (
                          <span className={`font-semibold flex-shrink-0 ${isSelected ? "text-amber-300" : "text-amberGold-600"}`}>
                            +₹{(opt.priceDeltaMinor / 100).toFixed(0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add to Cart Confirm Action */}
          <div className="pt-3 border-t border-cream-200">
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirmCustomize}
              className="w-full"
            >
              Add with Selected Preferences
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
