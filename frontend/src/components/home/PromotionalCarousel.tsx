"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Tag, ArrowRight } from "lucide-react";

export interface PromotionalCard {
  id: string;
  title: string;
  description: string;
  type?: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  couponCode?: string | null;
}

export const PromotionalCarousel: React.FC = () => {
  const [cards, setCards] = useState<PromotionalCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch eligible published promotional cards (max 5 from backend)
  useEffect(() => {
    let isMounted = true;
    async function loadPromotions() {
      try {
        const res = await fetch("/api/content/promotions");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.offers)) {
            // Guarantee strictly max 5 cards
            setCards(data.offers.slice(0, 5));
          }
        }
      } catch (err) {
        console.warn("Failed to load promotional carousel cards:", err);
      }
    }
    loadPromotions();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Detect reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // 3. Navigation handlers
  const handleNext = useCallback(() => {
    if (cards.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    if (cards.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  // 4. Automatic 1-second rotation when multiple cards exist & not paused/reduced-motion
  useEffect(() => {
    if (cards.length <= 1 || isPaused || reducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [cards.length, isPaused, reducedMotion, handleNext]);

  // 5. Hide container completely if no active cards
  if (!cards || cards.length === 0) {
    return null;
  }

  const currentCard = cards[currentIndex] || cards[0];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional Offers & Announcements"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative w-full rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white shadow-sm border border-stone-800 overflow-hidden"
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Content Section: Starts naturally with actual headline & concise description */}
        <div className="space-y-1.5 max-w-2xl min-h-[64px] flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-sm sm:text-base font-bold text-white tracking-tight">
              {currentCard.title}
            </h3>
            {currentCard.couponCode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                <Tag className="w-3 h-3" />
                {currentCard.couponCode}
              </span>
            )}
          </div>

          <p className="text-xs text-stone-300 leading-relaxed">
            {currentCard.description}
          </p>
        </div>

        {/* Right Section: Optional CTA & Carousel Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          {currentCard.ctaLabel && currentCard.ctaUrl && (
            <Link
              href={currentCard.ctaUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs shadow-sm transition"
            >
              <span>{currentCard.ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Manual Navigation Controls (Only shown if multiple cards exist) */}
          {cards.length > 1 && (
            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous promotional card"
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {cards.map((card, idx) => (
                  <button
                    key={card.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? "w-4 bg-rose-500" : "w-1.5 bg-stone-700 hover:bg-stone-500"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                aria-label="Next promotional card"
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
