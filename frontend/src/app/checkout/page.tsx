"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth, UserAddress } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { LocationModal } from "@/components/ui/LocationModal";
import { DynamicPaymentModal } from "@/components/payment/DynamicPaymentModal";
import {
  MapPin,
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    items,
    couponCode,
    validation,
    previewCalculation,
    clearCart,
  } = useCart();

  const { selectedAddress } = useAuth();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [upiOrderData, setUpiOrderData] = useState<{
    orderId: string;
    orderNumber: string;
    amountRupees: number;
  } | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items, router]);

  // Wait for session verification before rendering prompt
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cream-100 text-charcoal-500 text-xs font-medium animate-pulse">
          <ShieldCheck className="w-4 h-4 text-amberGold-500" />
          <span>Verifying account status...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, prompt or redirect to login/register with callbackUrl
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-cream-200 text-charcoal-500 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="font-serif text-2xl font-medium text-charcoal-700">
          Sign In to Place Your Order
        </h1>
        <p className="text-xs text-charcoal-500">
          Please log in with your mobile number or create an account to finalize your order with live delivery tracking.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Link href="/login?redirect=/checkout">
            <Button variant="primary" size="lg" className="w-full">
              Login with Mobile
            </Button>
          </Link>
          <Link href="/register?redirect=/checkout">
            <Button variant="outline" size="lg" className="w-full">
              New Customer? Register Here
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const subtotalRs =
    (validation ? validation.subtotalMinor : previewCalculation.subtotalMinor) / 100;
  const discountRs =
    (validation ? validation.discountMinor : previewCalculation.discountMinor) / 100;
  const deliveryRs =
    (validation ? validation.deliveryFeeMinor : previewCalculation.deliveryFeeMinor) / 100;
  const codFeeRs =
    (validation
      ? validation.codFeeMinor
      : previewCalculation.codFeeMinor) / 100;
  const totalRs =
    (validation
      ? validation.totalMinor
      : (previewCalculation.totalMinor + previewCalculation.codFeeMinor)) / 100;

  
  const handleSwitchToCod = async (orderIdToSwitch: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      const switchRes = await fetch(`/api/orders/${orderIdToSwitch}/switch-cod`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      const switchData = await switchRes.json().catch(() => ({}));
      if (switchRes.ok && switchData.success) {
        clearCart();
        setUpiOrderData(null);
        router.push(`/order-success?orderId=${orderIdToSwitch}&method=COD`);
      } else {
        setErrorMessage(switchData.error || "Failed to switch to COD.");
      }
    } catch {
      setErrorMessage("Network issue switching to COD.");
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddress) {
      setErrorMessage("Please select or enter your delivery address in Mulbagal.");
      return;
    }

    if (validation && !validation.isMinMeatMet && validation.meatShortfallGrams > 0) {
      setErrorMessage("Minimum order requirement of meat is not met.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        idempotencyKey: idempotencyKeyRef.current || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          customizations: i.customizations,
        })),
        addressId: selectedAddress.id && !selectedAddress.id.startsWith("guest_") && !selectedAddress.id.startsWith("addr_") && !selectedAddress.id.startsWith("local_") ? selectedAddress.id : undefined,
        customAddress: {
          label: selectedAddress.label || "Home",
          addressLine: selectedAddress.addressLine,
          locality: selectedAddress.locality || "Mulbagal",
          city: "Mulbagal",
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        couponCode: couponCode || undefined,
        paymentMethod: "COD",
        notes: notes.trim() || undefined,
      };

      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to place order. Please review your cart.");
        setIsSubmitting(false);
        return;
      }

      // COD: clear cart and redirect to order confirmation
      clearCart();
      router.push(`/order-success?orderId=${data.order.id}&method=COD`);
    } catch {
      setErrorMessage("Network error placing order. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <span className="text-[11px] uppercase font-mono font-bold text-emerald-800 tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Secure Checkout
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
          Review &amp; Place Order
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Direct delivery from Mulbagal Hub &bull; Fresh cut upon order confirmation &bull; Target ~20 minutes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Address & Payment Selection */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Delivery Address Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>1. Delivery Destination (Mulbagal)</span>
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLocationModalOpen(true)}
                className="text-xs font-semibold"
              >
                {selectedAddress ? "Change Address" : "Add Address"}
              </Button>
            </div>

            {selectedAddress ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 mt-0.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-900 text-white">
                      {selectedAddress.label}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">Mulbagal Central</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">
                    {selectedAddress.addressLine}
                  </p>
                  <p className="text-xs text-stone-600">
                    {selectedAddress.locality}, {selectedAddress.city} - {selectedAddress.postalCode || "563131"}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Target delivery: ~20 mins from store confirmation</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-stone-300 rounded-xl space-y-3 bg-stone-50/50">
                <p className="text-xs text-stone-600 font-medium">
                  No delivery address selected. Please confirm your location in Mulbagal to proceed.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="bg-stone-900 hover:bg-stone-800 text-white"
                >
                  Set Delivery Location
                </Button>
              </div>
            )}
          </div>

          {/* 2. Payment Method Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <h2 className="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-700" />
                <span>2. Payment Option: Cash on Delivery (COD)</span>
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 bg-stone-900 text-white rounded-full">
                COD ONLY
              </span>
            </div>

            <div className="p-4 rounded-xl border border-stone-900 bg-stone-50 ring-1 ring-stone-900 flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-stone-900 text-white mt-0.5">
                <Banknote className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-900">
                    Cash on Delivery &bull; Homemart4u Pay (Dynamic UPI QR)
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  No advance online payment is required. Pay when your fresh chicken or eggs reach your doorstep in Mulbagal. You can pay with physical cash or scan the delivery partner&apos;s UPI QR code upon arrival.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Delivery Instructions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              Delivery Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Near clock tower, call on arrival, leave with security"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Order Summary & Confirmation Button */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-stone-900">
                Order Summary
              </h3>
              <span className="text-xs font-mono font-medium text-stone-500">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            {/* Itemized List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs divide-y divide-stone-100">
              {items.map((i) => (
                <div key={i.id} className="pt-2 first:pt-0 flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-stone-900 block">{i.productName}</span>
                    <span className="text-stone-500 block text-[11px]">
                      {i.quantity} &times; {i.variantName}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    ₹{((i.unitPriceMinor * i.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Breakdown */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Product Subtotal</span>
                <span className="font-mono font-medium text-stone-800">₹{subtotalRs.toFixed(2)}</span>
              </div>

              {discountRs > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span className="font-mono">-₹{discountRs.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Delivery Charges</span>
                <span className="font-mono font-medium text-stone-800">
                  {deliveryRs === 0 ? "FREE" : `₹${deliveryRs.toFixed(2)}`}
                </span>
              </div>

              {codFeeRs > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>COD Convenience Surcharge</span>
                  <span className="font-mono font-medium text-stone-800">₹{codFeeRs.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
                <span className="font-serif font-bold text-stone-900 text-sm">
                  Final Amount Payable
                </span>
                <span className="font-mono text-xl font-bold text-stone-900">
                  ₹{totalRs.toFixed(2)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 leading-relaxed">
                {errorMessage}
              </p>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handlePlaceOrder}
                isLoading={isSubmitting}
                disabled={!selectedAddress}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs font-bold text-sm tracking-wide"
              >
                <span>Confirm &amp; Place Order &bull; ₹{totalRs.toFixed(0)}</span>
              </Button>
            </div>

            <p className="text-[10px] text-stone-500 text-center leading-relaxed">
              By placing this order, you agree to our{" "}
              <Link href="/terms-and-conditions" className="underline font-medium text-stone-700 hover:text-stone-900" target="_blank">
                Terms
              </Link>{" "}
              and acknowledge our{" "}
              <Link href="/cancellation-refund-policy" className="underline font-medium text-stone-700 hover:text-stone-900" target="_blank">
                Cancellation &amp; Refund Policy
              </Link>.
            </p>
          </div>
        </div>
      </div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {upiOrderData && (
        <DynamicPaymentModal
          isOpen={true}
          orderId={upiOrderData.orderId}
          orderNumber={upiOrderData.orderNumber}
          amountRupees={upiOrderData.amountRupees}
          onClose={() => setUpiOrderData(null)}
          onSwitchToCod={handleSwitchToCod}
          onSuccess={(finalOrderId) => {
            clearCart();
            setUpiOrderData(null);
            router.push(`/order-success?orderId=${finalOrderId}&method=ONLINE`);
          }}
        />
      )}


    </div>
  );
}
