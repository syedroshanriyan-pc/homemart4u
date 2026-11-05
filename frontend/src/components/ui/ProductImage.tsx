"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Utensils, Egg, ShoppingBag, Sparkles, ImageOff } from "lucide-react";

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  categorySlug?: string;
  department?: string;
  unoptimized?: boolean;
}

/**
 * Professional, resilient Product Image component.
 * - Supports any external HTTPS/HTTP URL, data URI, or local asset.
 * - Provides an elegant shimmering skeleton while loading.
 * - Gracefully and beautifully falls back to a branded placeholder on error or missing URL.
 * - Guarantees zero layout shifts, zero broken image icons, and zero crashes.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  fill = false,
  width,
  height,
  priority = false,
  sizes,
  className = "",
  categorySlug,
  department,
  unoptimized,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cleanSrc, setCleanSrc] = useState<string | null>(null);

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);

    if (!src || typeof src !== "string" || !src.trim()) {
      setCleanSrc(null);
      setIsLoading(false);
      return;
    }

    const trimmed = src.trim();
    // Validate if it is a valid URL or path
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("data:")
    ) {
      setCleanSrc(trimmed);
    } else {
      // Incomplete protocol: treat as https
      setCleanSrc(`https://${trimmed}`);
    }
  }, [src]);

  // Determine fallback type based on category / department
  const isEgg =
    categorySlug === "eggs" ||
    categorySlug?.includes("egg") ||
    alt.toLowerCase().includes("egg");
  const isMeat =
    department === "MEAT" ||
    categorySlug === "fresh-chicken" ||
    categorySlug?.includes("chicken") ||
    categorySlug?.includes("meat") ||
    alt.toLowerCase().includes("chicken") ||
    alt.toLowerCase().includes("mutton");

  // Fallback Placeholder Content
  const renderFallback = () => {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-3 select-none text-center transition-all ${
          isEgg
            ? "bg-gradient-to-br from-amber-50 via-amber-100/60 to-amber-50 text-amber-800"
            : isMeat
            ? "bg-gradient-to-br from-rose-50 via-rose-100/60 to-rose-50 text-rose-800"
            : "bg-gradient-to-br from-cream-100 via-cream-200/70 to-cream-100 text-charcoal-700"
        } ${fill ? "absolute inset-0" : ""}`}
      >
        <div
          className={`p-3 rounded-2xl mb-1.5 shadow-2xs ${
            isEgg
              ? "bg-amber-200/60 text-amber-900 border border-amber-300/60"
              : isMeat
              ? "bg-rose-200/60 text-rose-900 border border-rose-300/60"
              : "bg-white text-charcoal-800 border border-cream-300"
          }`}
        >
          {isEgg ? (
            <Egg className="w-6 h-6 stroke-[1.75]" />
          ) : isMeat ? (
            <Utensils className="w-6 h-6 stroke-[1.75]" />
          ) : (
            <ShoppingBag className="w-6 h-6 stroke-[1.75]" />
          )}
        </div>
        <span className="text-[11px] font-serif font-bold tracking-tight line-clamp-1 max-w-[85%] text-charcoal-800">
          {alt || "HomeMart4U"}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${
            isEgg
              ? "bg-amber-200/80 text-amber-950"
              : isMeat
              ? "bg-rose-200/80 text-rose-950"
              : "bg-emerald-100 text-emerald-900"
          }`}
        >
          <Sparkles className="w-2.5 h-2.5" />
          <span>{isEgg ? "Farm & Desi" : isMeat ? "100% Halal Fresh" : "Direct Wholesale"}</span>
        </span>
      </div>
    );
  };

  if (!cleanSrc || hasError) {
    return (
      <div className={`relative overflow-hidden w-full h-full ${className}`}>
        {renderFallback()}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${fill ? "w-full h-full" : ""}`}>
      {/* Loading Skeleton Shimmer */}
      {isLoading && (
        <div
          className={`absolute inset-0 z-10 bg-gradient-to-r from-cream-100 via-cream-200 to-cream-100 animate-pulse flex items-center justify-center`}
        >
          <div className="w-5 h-5 rounded-full border-2 border-amberGold-400 border-t-transparent animate-spin opacity-60" />
        </div>
      )}

      {/* Main Image with Smooth Opacity Transition */}
      <Image
        src={cleanSrc}
        alt={alt}
        fill={fill}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        priority={priority}
        sizes={sizes || (fill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
        unoptimized={unoptimized}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`${className} transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
};

export default ProductImage;
