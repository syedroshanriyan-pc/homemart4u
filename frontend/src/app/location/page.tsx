"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { calculateDeliveryFeePaise } from "@/lib/delivery";
import { MapPin, Navigation, Truck, Check, ArrowRight, Info } from "lucide-react";

export default function LocationPage() {
  const [distanceKm, setDistanceKm] = useState(3.5);

  const distanceMeters = Math.round(distanceKm * 1000);
  const feeMinor = calculateDeliveryFeePaise(distanceMeters);
  const feeRs = feeMinor / 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-semibold text-amberGold-600 tracking-wider">
          Service Territory
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-medium text-charcoal-700">
          Mulbagal City Delivery Zones
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed font-light">
          We are located at Srinivaspur Road, Mulbagal 563131. We deliver fresh groceries and tender meats throughout the city with a ~20-minute operational target.
        </p>
      </div>

      {/* Delivery Pricing Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="bg-cream-50 p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-subtle space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amberGold-50 text-amberGold-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal-700">
              Clear & Transparent Delivery Pricing
            </h2>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              We believe in honest local commerce with no hidden fuel markups or surge pricing.
            </p>
            <div className="space-y-3 text-xs text-charcoal-600">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>First 3 km (3000m) Free:</strong> Orders within 3km of our Srinivaspur Road hub incur zero delivery charges.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Beyond 3 km:</strong> Charged at exactly ₹1.50 per 100 metres (calculated strictly server-side).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Target Delivery Speed:</strong> Approximately 20 minutes from preparation confirmation.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-cream-200">
            <Link href="/menu" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-xs shadow-sm transition"><span>Start Your Order</span><ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Interactive Delivery Distance Calculator */}
        <div className="bg-cream-50 p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-subtle space-y-6">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
              Try It Out
            </span>
            <h3 className="font-serif text-lg font-semibold text-charcoal-700 mt-0.5">
              Live Delivery Fee Calculator
            </h3>
            <p className="text-xs text-charcoal-500">
              Adjust the distance slider to preview the exact delivery fee from our Mulbagal center.
            </p>
          </div>

          <div className="space-y-4 bg-cream-100/70 p-5 rounded-2xl border border-cream-200">
            <div className="flex justify-between items-baseline">
              <label className="text-xs font-semibold text-charcoal-700">
                Delivery Distance from Shop
              </label>
              <span className="font-mono text-base font-bold text-charcoal-800">
                {distanceKm.toFixed(1)} km ({distanceMeters}m)
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
              className="w-full accent-amberGold-600 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] text-charcoal-400">
              <span>0.5 km</span>
              <span>3.0 km (Free Limit)</span>
              <span>10.0 km</span>
            </div>

            <div className="pt-3 border-t border-cream-300 flex items-center justify-between">
              <div>
                <span className="text-xs text-charcoal-500 block">Calculated Delivery Fee:</span>
                <span className="text-[10px] text-charcoal-400">
                  {distanceMeters <= 3000
                    ? "Within free 3km radius"
                    : `${distanceMeters - 3000}m chargeable @ ₹1.50/100m`}
                </span>
              </div>
              <span className="font-serif text-2xl font-bold font-mono text-charcoal-800">
                {feeRs === 0 ? "FREE" : `₹${feeRs.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amberGold-50 border border-amberGold-200 text-xs text-charcoal-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amberGold-600 flex-shrink-0 mt-0.5" />
            <p>
              When placing an order, our system uses your exact GPS coordinates to compute precise road routing distances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
