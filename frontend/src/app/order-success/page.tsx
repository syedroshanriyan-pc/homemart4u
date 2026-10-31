"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  MapPin,
  Clock,
  Banknote,
  ShoppingBag,
  Truck,
  AlertCircle,
  Copy,
  Check,
  PhoneCall,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("No order identifier was provided. If you placed an order, you can check its status in your order history.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("You are not authorized to view this order. Please ensure you are logged into the correct account.");
          }
          if (res.status === 404) {
            throw new Error("We could not find the specified order record. Please check your order history.");
          }
          throw new Error("Unable to retrieve order details at this moment.");
        }

        const data = await res.json();
        if (!data.order) {
          throw new Error("Order confirmation details could not be found.");
        }
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || "Failed to load order confirmation.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handleCopyOrderNumber = (num: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-stone-200 border-t-emerald-600 animate-spin mx-auto" />
        <h2 className="font-serif text-xl font-bold text-stone-800">
          Confirming Your Order...
        </h2>
        <p className="text-xs text-stone-500">
          Retrieving order details from Mulbagal Hub.
        </p>
      </div>
    );
  }

  // Clean, helpful Error State
  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            We couldn&apos;t verify your order
          </h1>
          <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
            {error || "The requested order record could not be found or verified for your account."}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white"
          >
            Try Again
          </Button>
          <Link href="/cart" className="w-full">
            <Button variant="outline" size="md" className="w-full">
              Back to Cart
            </Button>
          </Link>
          <Link href="/contact" className="w-full">
            <Button variant="ghost" size="md" className="w-full text-stone-600 hover:text-stone-900">
              <PhoneCall className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let parsedAddress: any = null;
  try {
    parsedAddress = order.deliveryAddressSnapshot ? JSON.parse(order.deliveryAddressSnapshot) : null;
  } catch {}

  const totalRupees = (order.totalMinor / 100).toFixed(2);
  const subtotalRupees = (order.subtotalMinor / 100).toFixed(2);
  const discountRupees = (order.discountMinor / 100).toFixed(2);
  const deliveryRupees = (order.deliveryFeeMinor / 100).toFixed(2);
  const codFeeRupees = (order.codFeeMinor / 100).toFixed(2);

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Just now";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-fade-in">
      {/* 1. Google Pay / Meesho Inspired Celebratory Animated Checkmark */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {/* Subtle soft pulse glow behind checkmark */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-soft-pulse pointer-events-none" />
          
          {/* High-performance SVG circle and checkmark draw animation */}
          <svg
            className="relative w-24 h-24 text-emerald-600 drop-shadow-sm"
            viewBox="0 0 60 60"
            fill="none"
            aria-label="Order Placed Successfully"
          >
            <circle
              className="animate-checkmark-circle stroke-emerald-600"
              cx="30"
              cy="30"
              r="26"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              className="animate-checkmark-check stroke-emerald-600"
              d="M18 31 L26 39 L42 22"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Order Placed Successfully!
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          Thank you for ordering from Homemart4u.
        </p>

        {/* Order Reference Pill with Copy Button */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-800">
          <span>Order Number:</span>
          <span className="font-bold text-stone-900">#{order.orderNumber}</span>
          <button
            type="button"
            onClick={() => handleCopyOrderNumber(order.orderNumber)}
            title="Copy order number"
            className="p-1 hover:bg-stone-200 rounded text-stone-600 hover:text-stone-900 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Date and Time */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>Placed on {formattedDate}</span>
        </div>
      </div>

      {/* 2. Order Status Callout Box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
        <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
          <Truck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xs sm:text-sm font-bold text-emerald-950">
            Your order has been received. We will update you when it is confirmed and dispatched.
          </h2>
          <p className="text-xs text-emerald-800 leading-relaxed flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Target doorstep delivery: ~20 minutes from store confirmation in Mulbagal</span>
          </p>
        </div>
      </div>

      {/* 3. Main Order Confirmation Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Payment Method Notice Bar */}
        <div className="bg-stone-50 px-5 py-3.5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-900 text-white text-xs font-bold">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Payment Method: Cash on Delivery</span>
            </span>
          </div>

          <span className="text-xs text-stone-600">
            Pay <span className="font-bold text-stone-900 font-mono">₹{totalRupees}</span> at your doorstep
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Purchased Items List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-stone-700" />
              <span>Purchased Items ({order.items?.length || 0})</span>
            </h3>

            <div className="divide-y divide-stone-100 border-y border-stone-100">
              {order.items?.map((item: any) => {
                let customizationsList: any[] = [];
                try {
                  if (item.customizationSnapshotJson) {
                    customizationsList = JSON.parse(item.customizationSnapshotJson);
                  }
                } catch {}

                return (
                  <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-stone-900">
                        {item.productNameSnapshot}
                        {item.variantNameSnapshot && (
                          <span className="text-stone-500 font-normal"> &bull; {item.variantNameSnapshot}</span>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-500">
                        Quantity: <span className="font-semibold text-stone-800">{item.quantity}</span>
                        {item.weightGrams ? ` &bull; ${item.weightGrams}g` : ""}
                      </div>

                      {/* Cutting & Preparation Options / Egg Pack Details */}
                      {customizationsList.length > 0 && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/50 inline-block">
                          Preparation: {customizationsList.map((c) => c.option).join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="font-mono font-bold text-stone-900 text-right shrink-0">
                      ₹{(item.lineTotalMinor / 100).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Address Details */}
          {parsedAddress && (
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-700" />
                <span>Delivery Address</span>
              </span>
              <div className="text-xs font-bold text-stone-900">{parsedAddress.label || "Home"}</div>
              <p className="text-xs text-stone-700 leading-relaxed">
                {parsedAddress.addressLine}, {parsedAddress.locality || "Mulbagal"}, {parsedAddress.city || "Mulbagal"}
                {parsedAddress.postalCode ? ` - ${parsedAddress.postalCode}` : ""}
              </p>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-stone-700">
              <span className="font-sans">Items Subtotal</span>
              <span>₹{subtotalRupees}</span>
            </div>

            {order.discountMinor > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span className="font-sans">Coupon Discount ({order.couponCodeSnapshot || "PROMO"})</span>
                <span>-₹{discountRupees}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-700">
              <span className="font-sans">Delivery Fee</span>
              <span>{order.deliveryFeeMinor === 0 ? "FREE" : `₹${deliveryRupees}`}</span>
            </div>

            {order.codFeeMinor > 0 && (
              <div className="flex justify-between text-stone-700">
                <span className="font-sans">Cash on Delivery Convenience Surcharge</span>
                <span>₹{codFeeRupees}</span>
              </div>
            )}

            <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-bold text-stone-900">
              <span className="font-sans font-bold">Total Payable Amount</span>
              <span className="text-base font-extrabold text-stone-900 font-mono">₹{totalRupees}</span>
            </div>
          </div>

          {/* Cash on Delivery Instructions Note */}
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Please keep exact cash ready for the delivery partner upon arrival. Our rider also carries a UPI QR code if you prefer to scan and pay on delivery.
          </p>
        </div>

        {/* 4. Two Prominent Action Buttons */}
        <div className="p-5 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-3 justify-end">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Continue Shopping</span>
            </Button>
          </Link>
          <Link href={`/account/orders/${order.id}`} className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white"
            >
              <Truck className="w-4 h-4" />
              <span>Track My Order &bull; Track Status</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-stone-500">Loading order confirmation...</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
