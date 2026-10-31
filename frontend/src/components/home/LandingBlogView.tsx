"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  Truck,
  ShieldCheck,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  ShoppingBag,
  Milk,
  Wheat,
  Flame,
  ChefHat,
  ChevronRight,
  ExternalLink,
  User,
} from "lucide-react";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { Button } from "@/components/ui/Button";

interface LandingBlogViewProps {
  onEnterStore?: (dept?: "GROCERIES" | "MEAT") => void;
}

export const LandingBlogView: React.FC<LandingBlogViewProps> = ({ onEnterStore }) => {
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);

  const blogPosts = [
    {
      id: 1,
      title: "From Farm to Kitchen: How homemart4u Delivers Zero-Chilled Halal Chicken in Mulbagal",
      slug: "farm-to-kitchen-fresh-chicken-mulbagal",
      date: "Daily Quality Dispatch",
      readTime: "3 min read",
      category: "Meat & Quality",
      excerpt:
        "Unlike commercial chilled meats that spend days in cold storages, homemart4u sources live birds from verified local biosecure farms, preparing each cut only when an order is received at our Srinivaspur Road hub.",
      content: `At homemart4u, freshness is not a marketing term—it is our operating protocol. Standard supermarket meats are often chilled, thawed, and chemically treated to artificially extend shelf life. 

When you place an order on homemart4u:
1. Sourced from verified biosecure poultry farms around Kolar & Mulbagal.
2. 100% Halal certified hand-slaughtered strictly per Islamic dietary standards.
3. Cleaned with RO-purified water and cut with sterile surgical-grade blades.
4. Sealed in double-layered temperature-protective food-grade packages.
5. Handed directly to our delivery executive for express doorstep delivery in ~20 minutes.`,
      imageUrl: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      title: "The Ultimate Guide to Chicken Cuts: Curry Cut vs Biryani Cut vs Boneless",
      slug: "guide-to-chicken-cuts-curry-biryani-boneless",
      date: "Culinary Tips",
      readTime: "4 min read",
      category: "Cooking Guides",
      excerpt:
        "Selecting the right cut makes all the difference in moisture retention, gravy absorption, and cooking texture. Here is how our skilled butchers portion each piece for authentic South Indian recipes.",
      content: `Every traditional recipe requires a tailored cut to achieve optimum tenderness and flavor:

• Bone-in Curry Cut: Balanced mix of thigh, drumstick, and breast pieces. The marrow from the bones enriches gravies, sambars, and kormas with deep, rich flavor.
• Biryani Cut: Larger, premium cuts that retain moisture during dum slow-cooking, ensuring juicy, succulent meat that doesn't shred.
• Skinless Boneless Breast Strips: Lean, high-protein cuts ideal for quick stir-fries, tandoori marinades, shawarmas, and healthy gym diet prep.
• Tender Chicken Lollypops & Drumsticks: Perfectly frenched wings and juicy drumsticks designed for crispy shallow or deep frying.`,
      imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 3,
      title: "Farm-Fresh Eggs: Daily Nutrition and Quality Sourcing in Mulbagal",
      slug: "farm-fresh-eggs-daily-nutrition-mulbagal",
      date: "Farm Quality",
      readTime: "3 min read",
      category: "Eggs & Nutrition",
      excerpt:
        "Clean-shelled, fresh farm eggs and country desi eggs collected daily and delivered straight to your home in Mulbagal without long warehouse storage.",
      content: `At homemart4u, we ensure our eggs are truly fresh from local poultry farms:

• Daily Farm Collection: Eggs are collected daily from verified local farms to preserve freshness and nutrition.
• Graded & Clean-Shelled: Every egg is carefully inspected for intact shells and cleanliness.
• Protective Packaging: Packed in secure, cushioned egg trays to prevent damage during transit.
• Fast Doorstep Delivery: Delivered along with your fresh chicken cuts in ~20 minutes across Mulbagal.`,
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 animate-fade-in">
      {/* 1. Hero Section: Editorial & Clean */}
      <section className="relative overflow-hidden bg-[#2b0910] text-white pt-14 pb-20 sm:pt-20 sm:pb-28 border-b border-stone-800">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/80 border border-stone-700 text-rose-300 text-xs font-semibold tracking-wide">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>homemart4u &bull; Srinivaspur Road, Mulbagal</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.15]">
                Fresh Chicken &amp;{" "}
                <span className="italic font-serif text-amber-300">
                  Farm Eggs,
                </span>{" "}
                Delivered in ~20 Minutes.
              </h1>

              <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed font-sans font-light">
                Welcome to <strong>homemart4u</strong>. We deliver farm-fresh, hygienically portioned halal chicken cuts and farm eggs directly from our Srinivaspur Road hub to your home across Mulbagal.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {onEnterStore ? (
                  <Button
                    onClick={() => onEnterStore("MEAT")}
                    variant="primary"
                    size="lg"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    <span>Shop Chicken &amp; Eggs</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                ) : (
                  <Link href="/menu">
                    <Button
                      variant="primary"
                      size="lg"
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xl shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    >
                      <span>Shop Chicken &amp; Eggs</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                )}

                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-3.5 text-sm sm:text-base font-bold rounded-2xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 backdrop-blur-md shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <User className="w-4 h-4 mr-2 text-rose-300" />
                  <span>Sign In to Order</span>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-stone-800 text-xs text-stone-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>100% Halal Cuts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span>First 3km FREE</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Srinivaspur Road Hub</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-stone-800 bg-stone-900">
                <Image
                  src="https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=85"
                  alt="homemart4u Fresh Halal Chicken & Eggs Mulbagal"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-stone-900/85 backdrop-blur-md border border-stone-700 text-white flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                      Daily Fresh Stock
                    </p>
                    <p className="text-sm font-serif font-medium">Chicken &amp; Eggs Ready</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-300">Hub Delivery</span>
                    <p className="text-base font-bold text-emerald-400 font-serif">~20 Mins</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Direct Department Entry Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold text-rose-600 tracking-wider">
            Shop Fresh Categories
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
            Choose Chicken Cuts or Farm Eggs
          </h2>
          <p className="text-xs text-stone-500 mt-1.5">
            Prepared fresh upon your order from our Srinivaspur Road hub in Mulbagal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fresh Halal Chicken Card */}
          <div
            onClick={() => onEnterStore && onEnterStore("MEAT")}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-rose-950 to-stone-900 text-white p-7 sm:p-8 shadow-card border border-rose-800/40 hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-bold border border-rose-400/30 flex items-center gap-1.5">
                <HalalBadge size="sm" variant="outline" />
                <span>Hand-Slaughtered</span>
              </span>
              <span className="text-2xl">🍗</span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-white group-hover:text-amber-200 transition-colors">
              Fresh Chicken Cuts
            </h3>
            <p className="text-xs sm:text-sm text-stone-200 mt-2 leading-relaxed">
              Curry cuts, biryani cuts, boneless breasts, and drumsticks portioned cleanly upon order with zero cold-storage freezing.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
              <span>Browse Chicken Cuts</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Farm-Fresh Eggs Card */}
          <div
            onClick={() => onEnterStore && onEnterStore("MEAT")}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 text-white p-7 sm:p-8 shadow-card border border-amber-800/40 hover:shadow-xl transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-bold border border-amber-400/30">
                🥚 Daily Collected
              </span>
              <span className="text-2xl">🥚</span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-white group-hover:text-amber-200 transition-colors">
              Farm-Fresh Eggs
            </h3>
            <p className="text-xs sm:text-sm text-stone-200 mt-2 leading-relaxed">
              Carefully graded table eggs and country desi eggs packed in protective trays for safe doorstep delivery.
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
              <span>Browse Fresh Eggs</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Editorial & Knowledge Blog Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Editorial &bull; The homemart4u Journal</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mt-1">
              Food, Hygiene &amp; Cooking in Mulbagal
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Learn how we maintain zero-chill halal standards
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-stone-900 shadow-sm backdrop-blur-sm">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-2.5">
                  <div className="flex items-center gap-3 text-[11px] text-stone-400">
                    <span>{post.date}</span>
                    <span>&bull;</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 pt-0 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedArticle(selectedArticle === post.id ? null : post.id)
                  }
                  className="w-full text-left flex items-center justify-between text-xs font-bold text-rose-600 hover:text-rose-700 pt-3"
                >
                  <span>{selectedArticle === post.id ? "Hide Details" : "Read Full Article"}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${selectedArticle === post.id ? "rotate-90" : ""
                      }`}
                  />
                </button>

                {selectedArticle === post.id && (
                  <div className="mt-4 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 whitespace-pre-line leading-relaxed animate-fade-in">
                    {post.content}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Why Choose homemart4u (Clear, Minimal Body Section) */}
      <section className="bg-stone-100/70 border-y border-stone-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-bold text-rose-600 tracking-wider">
              Local Excellence
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mt-1">
              Why Mulbagal Relies on homemart4u
            </h2>
            <p className="text-xs text-stone-500 mt-2">
              Clean preparation, authentic halal cuts, and transparent pricing on Srinivaspur Road.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-serif font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                100% Halal Hand-Slaughter
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Slaughtered strictly per authentic Islamic dietary principles with individual prayer. No stunning, no mechanical lines, zero chemical tenderizers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-serif font-bold text-sm">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                Express ~20-Minute Delivery
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Positioned on Srinivaspur Road for rapid dispatch across Mulbagal city. First 3 km is 100% free delivery on every order.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-serif font-bold text-sm">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900">
                3-Min Easy Cancellation
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Made a mistake? You can instantly cancel your order within 3 minutes of confirmation with a live countdown and zero penalty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Ready to Order CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 text-white rounded-3xl p-8 sm:p-12 text-center shadow-card border border-stone-800 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-rose-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Ready for your doorstep order?</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-extrabold max-w-xl mx-auto">
            Order Fresh Chicken &amp; Eggs in Seconds
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto">
            Enjoy convenient Cash on Delivery and express ~20-minute doorstep delivery across Mulbagal.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            {onEnterStore ? (
              <Button
                onClick={() => onEnterStore()}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xl shadow-rose-600/40 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <span>Shop Chicken &amp; Eggs</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Link href="/menu" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xl shadow-rose-600/40 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <span>Shop Chicken &amp; Eggs</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            )}

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm sm:text-base font-bold rounded-2xl bg-stone-900 text-white border-2 border-stone-600 hover:bg-stone-800 hover:border-rose-400 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <User className="w-4 h-4 mr-2 text-rose-400" />
              <span>Sign In to Account</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
