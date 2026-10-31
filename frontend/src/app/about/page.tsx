import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Sparkles, ShieldCheck, CheckCircle2, Heart, Award, ArrowRight } from "lucide-react";

export const metadata = {
  title: "About Us | homemart4u Mulbagal",
  description: "Learn about homemart4u's biosecure poultry sourcing, fresh chicken cuts, farm eggs, and zero-chemical freshness philosophy in Mulbagal.",
};

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs uppercase font-semibold text-amberGold-600 tracking-wider">
          Our Craft &amp; Commitment
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-700 leading-tight">
          Fresh Chicken Cuts &amp; Farm Eggs Delivered in Mulbagal
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed font-light">
          Founded with a singular mission: to eliminate cold-storage frozen meats and provide our community with authentic, farm-fresh tender halal chicken and farm eggs prepared under the highest standards of hygiene.
        </p>
      </div>

      {/* Feature Story Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-card border border-cream-200">
          <Image
            src="https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=800&q=80"
            alt="Artisanal fresh chicken cutting station"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
            Dressed to Order, Never Frozen
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
            Most supermarket meats undergo frozen cycles, thawing, and chemical bathing to extend shelf-life. At homemart4u Mulbagal, we operate on a strict daily zero-stock-overnight model.
          </p>
          <div className="space-y-3 text-xs text-charcoal-600">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Direct partnership with local biosecure poultry farms in Kolar/Mulbagal</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Chilled fresh water washing & sanitised stainless steel cutting stations</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Customized to your recipe: Biryani cuts, Curry cuts, Boneless, Skinless</span>
            </div>
          </div>
        </div>
      </div>

      {/* Standards 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="p-3 rounded-xl bg-amberGold-50 text-amberGold-600 w-fit">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            Natural Sourcing
          </h3>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            Naturally reared healthy broilers and country chickens with zero hormonal stimulants or prophylactic antibiotics.
          </p>
        </div>

        <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="p-3 rounded-xl bg-amberGold-50 text-amberGold-600 w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            Food-Grade Packaging
          </h3>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            Sealed in eco-friendly, leak-proof insulated containers to retain natural tenderness and moisture during transit.
          </p>
        </div>

        <div className="bg-cream-50 p-6 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="p-3 rounded-xl bg-amberGold-50 text-amberGold-600 w-fit">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            Mulbagal Express Promise
          </h3>
          <p className="text-xs text-charcoal-500 leading-relaxed">
            Our local delivery network covers every corner of Mulbagal within ~20 minutes from the time your order is confirmed.
          </p>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link href="/menu">
          <Button variant="primary" size="lg">
            <span>Explore Today&apos;s Cuts</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
