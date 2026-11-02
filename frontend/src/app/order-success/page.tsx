"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiClient } from "@/lib/api-client";
import { Printer } from "lucide-react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const { clearCart } = useCart();

  // Instant State: Load order from sessionStorage immediately if available
  const [order, setOrder] = useState<any>(() => {
    if (typeof window !== "undefined" && orderId) {
      try {
        const stored = sessionStorage.getItem("fc_latest_order");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && (parsed.id === orderId || parsed.orderNumber === orderId)) {
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => !order);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Tax Invoice Modal State directly on Order Success Screen
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const handleOpenInvoice = async () => {
    setIsInvoiceModalOpen(true);
    const ordId = order?.id || orderId;
    if (!ordId) return;
    setInvoiceLoading(true);
    try {
      const data = await apiClient.get<{ invoice: any }>(`/api/orders/${ordId}/invoice`);
      if (data?.invoice) {
        setInvoiceData(data.invoice);
      }
    } catch {
      // Fallback will use local order data
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Clear any lingering cart items upon landing on confirmation screen
  useEffect(() => {
    try {
      clearCart();
    } catch {}
  }, [clearCart]);

  useEffect(() => {
    if (!orderId) {
      if (!order) {
        setError("No order identifier was provided. If you placed an order, you can check its status in your order history.");
        setLoading(false);
      }
      return;
    }

    const fetchOrder = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
        const res = await fetch(`/api/orders/${orderId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.order) {
            setOrder(data.order);
            setError(null);
          }
        } else {
          // If we do not have an order yet, surface informative error
          if (!order) {
            if (res.status === 401 || res.status === 403) {
              throw new Error("You are not authorized to view this order. Please ensure you are logged into the correct account.");
            }
            if (res.status === 404) {
              throw new Error("We could not find the specified order record. Please check your order history.");
            }
            throw new Error("Unable to retrieve order details at this moment.");
          }
        }
      } catch (err: any) {
        if (!order) {
          setError(err.message || "Failed to load order confirmation.");
        }
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

  const targetOrderId = order?.id || order?.orderNumber || orderId;
  const trackOrderUrl = targetOrderId ? `/account/orders/${targetOrderId}` : "/account/orders";

  const saveOrderToSession = () => {
    if (typeof window !== "undefined" && order) {
      try {
        sessionStorage.setItem("fc_latest_order", JSON.stringify(order));
      } catch {}
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
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition shadow-sm cursor-pointer text-center"
          >
            Try Again
          </button>
          <Link
            href="/cart"
            className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition text-center inline-block"
          >
            Back to Cart
          </Link>
          <Link
            href="/contact"
            className="w-full py-2.5 px-4 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium text-xs transition flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Contact Support</span>
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

  const displayInvoice = invoiceData || (order ? {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    date: order.placedAt || order.createdAt,
    deliveredAt: order.deliveredAt,
    status: order.status,
    shop: {
      name: "HomeMart4U",
      tagline: "Farm Fresh Halal Meats & Daily Groceries",
      address: "Srinivaspur Road, Mulbagal, Karnataka 563131",
      phone: "+91 90355 26638",
      email: "support.homemart4u@gmail.com",
      gstNumber: "29AABCH2026M1Z5",
      fssaiNumber: "11223334000123",
    },
    customer: {
      name: order.user?.name || "Customer",
      mobile: order.user?.mobile || "",
      address: parsedAddress,
    },
    items: (order.items || []).map((i: any) => ({
      productName: i.productNameSnapshot || i.product?.name,
      variantName: i.variantNameSnapshot || i.variant?.name,
      quantity: i.quantity,
      weightGrams: i.weightGrams,
      unitPriceRs: (i.unitPriceMinor / 100).toFixed(2),
      lineTotalRs: (i.lineTotalMinor / 100).toFixed(2),
    })),
    summary: {
      subtotalRs: (order.subtotalMinor / 100).toFixed(2),
      discountRs: (order.discountMinor / 100).toFixed(2),
      deliveryFeeRs: (order.deliveryFeeMinor / 100).toFixed(2),
      codFeeRs: (order.codFeeMinor / 100).toFixed(2),
      totalRs: (order.totalMinor / 100).toFixed(2),
      paymentMethod: order.payment?.method || "COD",
      paymentStatus: order.payment?.status || "PENDING",
    },
  } : null);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 pb-24 sm:pb-32 space-y-8 animate-fade-in">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Please keep exact cash ready for the delivery partner upon arrival. Our rider also carries a UPI QR code if you prefer to scan and pay on delivery.
              </p>
              <button
                type="button"
                onClick={handleOpenInvoice}
                className="shrink-0 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 cursor-pointer select-none"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Tax Invoice</span>
              </button>
            </div>
          </div>

          {/* Stage 5: Primary Action Buttons */}
          <div className="relative z-30 p-5 sm:p-6 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-3 justify-end">
            <Link
              href="/menu"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 active:bg-stone-200 text-stone-800 text-xs font-bold transition shadow-2xs hover:shadow-sm text-center cursor-pointer select-none touch-manipulation active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4 text-stone-600" />
              <span>Continue Shopping</span>
            </Link>
            <Link
              href={trackOrderUrl}
              onClick={saveOrderToSession}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 text-center cursor-pointer select-none touch-manipulation active:scale-[0.98]"
            >
              <Truck className="w-4 h-4" />
              <span>Track My Order &bull; Track Status</span>
            </Link>
          </div>
        </div>
      {/* Official Tax Invoice & Cash Memo Modal on Confirmation Page */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={displayInvoice ? `Tax Invoice • ${displayInvoice.invoiceNumber || `INV-${order.orderNumber}`}` : "Invoice"}
        maxWidth="xl"
      >
        <div className="space-y-5">
          {displayInvoice ? (
            <div id="invoice-printable-area" className="bg-white rounded-xl p-4 sm:p-6 border border-stone-200 text-stone-800 space-y-5 text-xs shadow-2xs">
              {/* Header: Brand & Invoice Meta */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-stone-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl font-bold tracking-tight text-stone-900">
                      HomeMart4U
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      100% Halal Assured
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5 font-medium">
                    Farm Fresh Halal Meats &amp; Daily Groceries
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Srinivaspur Road, Mulbagal, Karnataka 563131
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Helpline: +91 90355 26638 &bull; GSTIN: 29AABCH2026M1Z5
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                    Tax Invoice / Cash Memo
                  </span>
                  <p className="font-mono font-bold text-stone-900 text-sm mt-1.5">
                    {displayInvoice.invoiceNumber || `INV-${order.orderNumber}`}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Date: {new Date(order.placedAt || order.createdAt || Date.now()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[11px] text-stone-700 font-semibold mt-0.5">
                    Order Status: <span className="uppercase text-emerald-800">{order.status || "CONFIRMED"}</span>
                  </p>
                </div>
              </div>

              {/* Bill To & Delivery Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-stone-200 text-[11px]">
                <div>
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                    Billed To (Customer):
                  </span>
                  <p className="font-bold text-stone-900 text-xs mt-0.5">
                    {displayInvoice.customer?.name || order.user?.name || "Customer"}
                  </p>
                  <p className="text-stone-600">
                    Mobile: {displayInvoice.customer?.mobile || order.user?.mobile || parsedAddress?.phone || "Not specified"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                    Delivery Destination:
                  </span>
                  <p className="text-stone-800 font-semibold mt-0.5">
                    {parsedAddress?.addressLine || parsedAddress?.streetArea || "Mulbagal Town"}
                  </p>
                  <p className="text-stone-500">
                    Mulbagal, Karnataka {parsedAddress?.pincode || "563131"}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Item Description</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Unit Rate</th>
                      <th className="py-2 pl-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(displayInvoice.items || []).map((item: any, idx: number) => {
                      const lineTotal = item.lineTotalRs || (item.lineTotalMinor ? (item.lineTotalMinor / 100).toFixed(2) : "0.00");
                      const unitPrice = item.unitPriceRs || (item.unitPriceMinor ? (item.unitPriceMinor / 100).toFixed(2) : "0.00");
                      return (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 pr-2 font-mono text-stone-400">{idx + 1}</td>
                          <td className="py-2.5 pr-2">
                            <p className="font-semibold text-stone-800">
                              {item.productName || item.productNameSnapshot}
                            </p>
                            <p className="text-[10px] text-stone-500">
                              {item.variantName || item.variantNameSnapshot} {item.weightGrams ? `• ${item.weightGrams >= 1000 ? `${item.weightGrams / 1000}kg` : `${item.weightGrams}g`}` : ""}
                            </p>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-medium">{item.quantity}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-stone-600">₹{unitPrice}</td>
                          <td className="py-2.5 pl-2 text-right font-mono font-bold text-stone-900">₹{lineTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Breakdown */}
              <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="text-[11px] text-stone-500 space-y-1">
                  <p><span className="font-semibold text-stone-700">Payment Mode:</span> {order.payment?.method || "Cash on Delivery (COD)"}</p>
                  <p><span className="font-semibold text-stone-700">Payment Status:</span> {order.payment?.status === "COMPLETED" ? "PAID" : "PENDING (Collect upon delivery)"}</p>
                  <p className="text-[10px] text-stone-400 pt-1">FSSAI Certified • Freshly packed in clean food-grade packaging</p>
                </div>

                <div className="w-full sm:w-64 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Items Subtotal:</span>
                    <span>₹{(order.subtotalMinor / 100).toFixed(2)}</span>
                  </div>
                  {order.discountMinor > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount:</span>
                      <span>-₹{(order.discountMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-600">
                    <span>Delivery Fee:</span>
                    <span>{order.deliveryFeeMinor === 0 ? "FREE" : `₹${(order.deliveryFeeMinor / 100).toFixed(2)}`}</span>
                  </div>
                  {order.codFeeMinor > 0 && (
                    <div className="flex justify-between text-stone-600">
                      <span>COD Surcharge:</span>
                      <span>₹{(order.codFeeMinor / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-300">
                    <span>Total Payable:</span>
                    <span>₹{(order.totalMinor / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500 text-xs">
              <div className="w-8 h-8 rounded-full border-2 border-stone-200 border-t-emerald-600 animate-spin mx-auto mb-2" />
              <span>Preparing invoice details...</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.print();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <div className="flex items-center gap-2">
              <Link
                href={trackOrderUrl}
                onClick={saveOrderToSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Track Live Order</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>
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
