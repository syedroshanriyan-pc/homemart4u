"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { LocationModal } from "@/components/ui/LocationModal";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  AlertTriangle,
  Tag,
  Check,
  X,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    couponCode,
    applyCoupon,
    removeCoupon,
    validation,
    isValidating,
  } = useCart();

  const { selectedAddress } = useAuth();
  const [couponInput, setCouponInput] = useState(couponCode || "");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [couponMsg, setCouponMsg] = useState("");

  const [storeStatus, setStoreStatus] = useState<string>("OPEN");
  const [storeClosedMessage, setStoreClosedMessage] = useState<string>("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.store_status) {
          setStoreStatus(data.settings.store_status);
        }
        if (data?.settings?.store_closed_message) {
          setStoreClosedMessage(data.settings.store_closed_message);
        }
      })
      .catch(() => {});
  }, []);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    await applyCoupon(couponInput);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-cream-200 text-charcoal-500 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
          Your Cart is Empty
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto">
          Explore our daily farm-fresh cuts, chicken 65, farm eggs, and chilled beverages delivered fresh in Mulbagal.
        </p>
        <div className="pt-2">
          <Link href="/menu" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-sm shadow-sm transition"><span>Browse Fresh Menu</span><ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    );
  }

  // Financial values from server validation (or fallback calculation while validating)
  const subtotalRs = validation ? validation.subtotalMinor / 100 : items.reduce((s, i) => s + (i.unitPriceMinor * i.quantity) / 100, 0);
  const discountRs = validation ? validation.discountMinor / 100 : 0;
  const deliveryRs = validation ? validation.deliveryFeeMinor / 100 : 0;
  const totalRs = validation ? (validation.totalMinor - validation.codFeeMinor) / 100 : subtotalRs + deliveryRs - discountRs;

  const isMinMeatMet = validation ? validation.isMinMeatMet : true;
  const currentMeatGrams = validation ? validation.qualifyingMeatGrams : 0;
  const meatShortfall = validation ? validation.meatShortfallGrams : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
            Shopping Cart
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Review your items and customizable cuts before final checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      {storeStatus === "CLOSED" && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Store is Temporarily Closed</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              {storeClosedMessage || "We are currently closed and not accepting new orders at this time. You can still review your cart and browse our catalogue."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Minimum Meat Rule Validation Alert Banner (if configured) */}
          {!isMinMeatMet && meatShortfall > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Minimum Meat Order Requirement
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    This order requires a minimum of <strong>{currentMeatGrams + meatShortfall}g</strong> of qualifying meat. Your cart currently has <strong>{currentMeatGrams}g</strong> (need <strong>{meatShortfall}g</strong> more).
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <Link href="/menu" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold text-xs transition">Add More Meat Cuts &rarr;</Link>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 divide-y divide-cream-200 shadow-subtle overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 flex items-start gap-4">
                {/* Image */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-cream-100 flex-shrink-0 border border-cream-200">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-sm sm:text-base font-semibold text-charcoal-700">
                        {item.productName}
                      </h3>
                      <p className="text-xs text-charcoal-500 font-medium">
                        {item.variantName}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-charcoal-400 hover:text-red-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Selected Customizations */}
                  {item.customizations && item.customizations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.customizations.map((c, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-cream-100 text-[10px] text-charcoal-700 border border-cream-200 font-medium"
                        >
                          {c.group ? <span className="opacity-70">{c.group}: </span> : null}
                          <span>{c.option}</span>
                          {c.priceDeltaMinor && c.priceDeltaMinor > 0 ? (
                            <span className="text-emerald-700 font-semibold ml-1">
                              (+₹{(c.priceDeltaMinor / 100).toFixed(0)})
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price & Quantity Controls */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center border border-cream-300 rounded-xl bg-cream-100/70 p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 rounded-lg hover:bg-cream-200 text-charcoal-600 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold font-mono text-charcoal-700">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1.5 rounded-lg hover:bg-cream-200 text-charcoal-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-bold text-charcoal-700 font-serif">
                        ₹{((item.unitPriceMinor * item.quantity) / 100).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-charcoal-400 block">
                        (₹{(item.unitPriceMinor / 100).toFixed(0)} each)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Location Preview */}
          <div className="p-4 rounded-2xl bg-cream-50 border border-cream-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-cream-100 text-amberGold-600 flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-charcoal-400 tracking-wider">
                  Delivering to
                </p>
                <p className="text-xs text-charcoal-700 font-medium truncate">
                  {selectedAddress
                    ? `${selectedAddress.locality || selectedAddress.addressLine}, Mulbagal`
                    : "Tap to set delivery location in Mulbagal"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLocationModalOpen(true)}
              className="flex-shrink-0"
            >
              {selectedAddress ? "Change" : "Select"}
            </Button>
          </div>
        </div>

        {/* Right: Bill Summary & Checkout Action */}
        <div className="lg:col-span-4 space-y-6">
          {/* Coupon Entry Box */}
          <div className="bg-cream-50 p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amberGold-600" />
                <span>Apply Coupon Code</span>
              </span>
              <Link href="/offers" className="text-[11px] text-amberGold-600 font-semibold hover:underline">
                View Offers
              </Link>
            </div>

            {couponCode ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono text-xs font-bold text-emerald-800">
                    {couponCode} APPLIED
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-1 text-emerald-800 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. FRESH100"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs uppercase font-mono bg-cream-100 border border-cream-300 rounded-xl text-charcoal-700 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Apply
                </Button>
              </form>
            )}
          </div>

          {/* Bill Summary */}
          <div className="bg-cream-50 p-5 sm:p-6 rounded-2xl border border-cream-200 shadow-subtle space-y-4">
            <h3 className="font-serif text-base font-medium text-charcoal-700 border-b border-cream-200 pb-3">
              Order Bill Summary
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-charcoal-600">
                <span>Items Subtotal</span>
                <span className="font-medium text-charcoal-700 font-mono">
                  ₹{subtotalRs.toFixed(2)}
                </span>
              </div>

              {discountRs > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{discountRs.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-charcoal-600">
                <div>
                  <span>Delivery Charge</span>
                  {validation?.deliveryDistanceMeters ? (
                    <span className="text-[10px] text-charcoal-400 block">
                      ({(validation.deliveryDistanceMeters / 1000).toFixed(1)} km from Mulbagal store)
                    </span>
                  ) : (
                    <span className="text-[10px] text-charcoal-400 block">(First 3 km Free)</span>
                  )}
                </div>
                <span className="font-medium text-charcoal-700 font-mono">
                  {deliveryRs === 0 ? "FREE" : `₹${deliveryRs.toFixed(2)}`}
                </span>
              </div>


              <div className="pt-3 border-t border-cream-200 flex justify-between items-baseline text-sm">
                <div>
                  <span className="font-serif font-bold text-charcoal-800">
                    Grand Total
                  </span>
                  <span className="text-[10px] text-charcoal-400 block">
                    Inclusive of all taxes & fees
                  </span>
                </div>
                <span className="font-serif text-xl font-bold text-charcoal-800 font-mono">
                  ₹{totalRs.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Validation Errors */}
            {validation?.errors && validation.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
                {validation.errors.map((err, idx) => (
                  <p key={idx}>&bull; {err}</p>
                ))}
              </div>
            )}

            {/* Checkout CTA */}
            <div className="pt-2">
              {storeStatus === "CLOSED" ? (
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-sm cursor-not-allowed shadow-none"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Store Closed &bull; Ordering Paused</span>
                </button>
              ) : (!isMinMeatMet || (validation && !validation.isValid)) ? (
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-charcoal-300 text-charcoal-500 font-bold text-sm cursor-not-allowed"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-charcoal-900 font-bold text-sm shadow-md transition"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}
