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
  CheckCircle2,
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
            We couldn&apos;t place your order
          </h1>
          <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
            {error || "Your order hasn't been confirmed. Please try again."}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => window.location.reload()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
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
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          {/* Subtle soft pulse glow & expanding ripple */}
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-expanding-ring pointer-events-none" />
          <div className="absolute inset-2 rounded-full bg-emerald-500/15 animate-soft-pulse pointer-events-none" />

          {/* Celebratory subtle sparkles */}
          <span className="absolute -top-1 -right-1 text-emerald-500 text-xs animate-sparkle-1 select-none">✦</span>
          <span className="absolute -bottom-1 -left-1 text-amber-500 text-xs animate-sparkle-2 select-none">★</span>
          <span className="absolute top-2 -left-2 text-emerald-400 text-xs animate-sparkle-3 select-none">✦</span>
          <span className="absolute -bottom-2 right-2 text-amber-400 text-xs animate-sparkle-4 select-none">★</span>

          {/* Large Green Circular Badge (Google Pay inspired) */}
          <div className="relative w-[92px] h-[92px] rounded-full bg-emerald-600 shadow-xl shadow-emerald-600/30 flex items-center justify-center animate-success-pop">
            <svg
              className="w-16 h-16 text-white"
              viewBox="0 0 60 60"
              fill="none"
              aria-label="Order Placed Successfully"
            >
              <circle
                className="animate-checkmark-circle stroke-white/40"
                cx="30"
                cy="30"
                r="26"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                className="animate-checkmark-check stroke-white"
                d="M18 31 L26 39 L42 22"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Stage 3: Confirmation Message */}
        <div className="space-y-2 animate-stage-3">
          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Order Placed Successfully!
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Your order has been received. Thank you for shopping with Homemart4u.
          </p>

          {/* Order Reference Pill with Copy Button */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-mono font-medium text-stone-800 shadow-2xs">
            <span>Order Number:</span>
            <span className="font-bold text-stone-900">#{order.orderNumber}</span>
            <button
              type="button"
              onClick={() => handleCopyOrderNumber(order.orderNumber)}
              title="Copy order number"
              className="p-1 hover:bg-stone-100 rounded text-stone-600 hover:text-stone-900 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Date and Time */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono pt-0.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Placed on {formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Stage 4: Order Details & Information Cards */}
      <div className="space-y-6 animate-stage-4">
        {/* Order Reference & Meta Status Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Order ID</span>
            <span className="font-mono font-bold text-stone-900">#{order.orderNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Order Status</span>
            <span className="font-semibold text-emerald-800 capitalize">
              {order.status?.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Payment Method</span>
            <span className="font-semibold text-stone-900">Cash on Delivery</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Payment Status</span>
            <span className="font-semibold text-amber-700">Pending collection</span>
          </div>
        </div>

        {/* Four-Stage Order Progress Tracker */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Order Progress
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {order.status === "DELIVERED"
                ? "Delivered"
                : order.status === "OUT_FOR_DELIVERY"
                ? "Out for Delivery"
                : order.status === "CONFIRMED" || order.status === "PREPARING"
                ? "Confirmed & Preparing"
                : "Order Placed"}
            </span>
          </div>

          {/* Horizontal Progress Bar with Steps */}
          <div className="grid grid-cols-4 gap-2 relative">
            {[
              {
                label: "Order Placed",
                completed: true,
                step: 1,
              },
              {
                label: "Order Confirmed",
                completed: ["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status),
                step: 2,
              },
              {
                label: "Out for Delivery",
                completed: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status),
                step: 3,
              },
              {
                label: "Delivered",
                completed: order.status === "DELIVERED",
                step: 4,
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center space-y-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s.completed
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-stone-100 text-stone-400 border border-stone-200"
                  }`}
                >
                  {s.completed ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                </div>
                <span
                  className={`text-[10px] sm:text-xs leading-tight ${
                    s.completed ? "font-bold text-stone-900" : "text-stone-400 font-medium"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* What's Next Information Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
            <Truck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xs sm:text-sm font-bold text-emerald-950">
              What&apos;s next?
            </h2>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Your order has been received. We will keep you updated on its progress.
            </p>
            <p className="text-xs text-emerald-800 leading-relaxed flex items-center gap-1.5 pt-0.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Target doorstep delivery: ~20 minutes from store confirmation in Mulbagal</span>
            </p>
          </div>
        </div>

        {/* Main Order Confirmation Card */}
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
                      <div className="flex items-start gap-3">
                        {/* Product Image Thumbnail */}
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.productNameSnapshot}
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover bg-stone-100 border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}

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
                            {" &bull; "}
                            <span className="font-mono">₹{((item.unitPriceMinor || item.lineTotalMinor / item.quantity) / 100).toFixed(2)}</span> each
                          </div>

                          {/* Cutting & Preparation Options / Egg Pack Details */}
                          {customizationsList.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {customizationsList.map((c: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  {c.groupName ? `${c.groupName}: ` : ""}{c.option}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
              <div className="bg-stone-50/80 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Delivery Address</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200/70 text-stone-700">
                    {parsedAddress.label || "Home"}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-900">
                  {order.user?.name || parsedAddress.name || "Customer"}
                  {(order.user?.mobile || parsedAddress.mobile) && (
                    <span className="font-normal text-stone-500 font-mono"> &bull; {order.user?.mobile || parsedAddress.mobile}</span>
                  )}
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  {parsedAddress.addressLine}
                  {parsedAddress.locality ? `, ${parsedAddress.locality}` : ""}
                  {parsedAddress.city ? `, ${parsedAddress.city}` : ", Mulbagal"}
                  {parsedAddress.state ? `, ${parsedAddress.state}` : ", Karnataka"}
                  {parsedAddress.postalCode ? ` - ${parsedAddress.postalCode}` : " - 563131"}
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

          {/* Stage 5: Primary Action Buttons */}
          <div className="p-5 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-3 justify-end animate-stage-5">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full flex items-center justify-center gap-2 bg-white hover:bg-stone-100 text-stone-700 border-stone-300">
                <ShoppingBag className="w-4 h-4" />
                <span>Continue Shopping</span>
              </Button>
            </Link>
            <Link href={`/account/orders/${order.id}`} className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
              >
                <Truck className="w-4 h-4" />
                <span>Track My Order &bull; Track Status</span>
              </Button>
            </Link>
          </div>
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
