"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  Star,
  RotateCcw,
  Bike,
  Shield,
  Phone,
  Check,
  Printer,
} from "lucide-react";
import { OrderDetailSkeleton } from "@/components/ui/Skeleton";
import { useRealTime } from "@/lib/useRealTime";
import { apiClient } from "@/lib/api-client";
import { ProductImage } from "@/components/ui/ProductImage";
export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  // Instant State: Preload order from sessionStorage if available for zero-latency rendering
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
  const [errorMsg, setErrorMsg] = useState("");

  // Review state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Invoice state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);

  // Dynamic Payment Modal state

  // 20-Minute Live Delivery Countdown Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // 3-Minute Cancellation Window Timer State
  const [cancelSecondsRemaining, setCancelSecondsRemaining] = useState<number | null>(null);
  const isPrepaidOrder = false;

  useEffect(() => {
    if (!order?.placedAt || order.status === "DELIVERED" || order.status === "CANCELLED") {
      return;
    }

    const calculateTimers = () => {
      // The 20-minute delivery countdown begins ONLY after the order is confirmed by the admin
      if (order.confirmedAt) {
        const confirmedTime = new Date(order.confirmedAt).getTime();
        const targetDeliveryTime = confirmedTime + 20 * 60 * 1000; // 20 minutes from admin confirmation
        const diffSecs = Math.max(0, Math.floor((targetDeliveryTime - Date.now()) / 1000));
        setRemainingSeconds(diffSecs);
      } else {
        setRemainingSeconds(null);
      }

      // Cancellation window only applies to COD orders; prepaid orders cannot be cancelled
      const isPrepaid = order.payment && (order.payment.method !== "COD" || order.payment.status === "COMPLETED");
      if (!isPrepaid) {
        const placedTime = new Date(order.placedAt).getTime();
        const cancelCutoff = placedTime + 3 * 60 * 1000;
        const cancelDiff = Math.max(0, Math.floor((cancelCutoff - Date.now()) / 1000));
        setCancelSecondsRemaining(cancelDiff);
      } else {
        setCancelSecondsRemaining(null);
      }
    };

    calculateTimers();
    const timer = setInterval(calculateTimers, 1000);
    return () => clearInterval(timer);
  }, [order?.placedAt, order?.confirmedAt, order?.status, order?.payment]);

  const fetchOrder = async () => {
    try {
      const data = await apiClient.get<{ order: any }>(`/api/orders/${orderId}`);
      if (data && data.order) {
        setOrder(data.order);
        setErrorMsg("");
      } else if (!order) {
        setErrorMsg("Order not found");
      }
    } catch (err: any) {
      if (!order) {
        setErrorMsg(err.message || "Failed to connect to server");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("invoice") === "true") {
      handleOpenInvoice();
    }
    fetchOrder();
    // Poll every 10 seconds for real-time status updates while order is active
    const interval = setInterval(() => {
      if (order?.status !== "DELIVERED" && order?.status !== "CANCELLED") {
        fetchOrder();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!order?.id) return;
    if (isPrepaidOrder) {
      alert("Prepaid orders cannot be cancelled online.");
      return;
    }
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setIsCancelling(true);
    try {
      const res = await apiClient.post(`/api/orders/${order.id}/cancel`, {
        reason: "Customer requested cancellation",
      });
      await fetchOrder();
    } catch {
      alert("Error cancelling order");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id) return;
    setSubmittingReview(true);
    try {
      await apiClient.post(`/api/orders/${order.id}/review`, {
        rating,
        comment: reviewComment,
      });
      setReviewSuccess(true);
      await fetchOrder();
      setTimeout(() => setIsReviewModalOpen(false), 1200);
    } catch {
      alert("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenInvoice = async () => {
    setIsInvoiceModalOpen(true);
    if (!order?.id) return;
    setInvoiceLoading(true);
    try {
      const data = await apiClient.get<{ invoice: any }>(`/api/orders/${order.id}/invoice`);
      if (data?.invoice) {
        setInvoiceData(data.invoice);
      }
    } catch (e) {
      console.warn("Invoice API fetch failed, falling back to cached order data", e);
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (!order || errorMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h2 className="font-serif text-lg font-semibold text-charcoal-700">
          Order Not Found
        </h2>
        <p className="text-xs text-charcoal-500">{errorMsg || "Unable to access this order."}</p>
        <Link href="/account/orders" className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-bold text-xs transition shadow-2xs">Back to Orders</Link>
      </div>
    );
  }

  // 5 exact status lifecycle stages
  const stages = [
    { key: "PLACED", label: "Placed", time: order.placedAt },
    { key: "CONFIRMED", label: "Confirmed", time: order.confirmedAt },
    { key: "PREPARING", label: "Preparing", time: order.preparingAt },
    { key: "OUT_FOR_DELIVERY", label: "On the way", time: order.outForDeliveryAt },
    { key: "DELIVERED", label: "Delivered", time: order.deliveredAt },
  ];

  const statusOrder = ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];
  const currentStageIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

    const displayInvoice = invoiceData || (order ? {
    invoiceNumber: `INV-${order.orderNumber}`,
    orderNumber: order.orderNumber,
    date: order.placedAt,
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
      name: user?.name || "Customer",
      mobile: user?.mobile || "",
      address: order.deliveryAddress,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Banner: Order Header */}
      <div className="bg-cream-50 rounded-3xl border border-cream-200 p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl font-bold text-charcoal-800">
              Order #{order.orderNumber}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-xs text-charcoal-500 mt-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amberGold-600" />
            Placed on {new Date(order.placedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInvoice}
            className="text-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>View Invoice</span>
          </Button>

          {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
            <>
              {isPrepaidOrder ? (
                <span className="text-[10px] text-emerald-800 font-semibold px-2.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1 shadow-2xs">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span>Prepaid Order</span>
                </span>
              ) : cancelSecondsRemaining !== null && cancelSecondsRemaining > 0 ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelOrder}
                  isLoading={isCancelling}
                  className="text-xs font-semibold shadow-sm"
                >
                  <span>
                    Cancel COD ({Math.floor(cancelSecondsRemaining / 60)}:
                    {String(cancelSecondsRemaining % 60).padStart(2, "0")})
                  </span>
                </Button>
              ) : (
                <span className="text-[10px] text-stone-500 font-medium px-2.5 py-1.5 bg-stone-100 rounded-xl border border-stone-200">
                  Cancel window closed
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notice when order is placed and awaiting store admin confirmation */}
      {!isCancelled && order.status === "PLACED" && !order.confirmedAt && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-5 shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
            <Clock className="w-5 h-5 text-amber-600 animate-spin" />
            <span>Order Received — Awaiting Store Confirmation</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Your order has reached our hub (Srinivaspur Road, Mulbagal). <strong>Your 20-minute delivery countdown timer will begin the moment our store admin confirms your order.</strong>
          </p>
        </div>
      )}

      {/* 20-Minute Express Delivery Live Countdown Timer (Begins ONLY after Admin Confirmation) */}
      {!isCancelled && order.status !== "DELIVERED" && order.confirmedAt && remainingSeconds !== null && (
        <div className="bg-gradient-to-r from-charcoal-700 via-charcoal-800 to-amber-950 text-cream-50 rounded-3xl p-6 shadow-card border border-amberGold-400/40 space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amberGold-500/20 text-amberGold-400 flex items-center justify-center border border-amberGold-400/30 flex-shrink-0 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-amberGold-300 font-bold block">
                  ⚡ 20-Minute Express Delivery Guarantee
                </span>
                <h3 className="font-serif text-lg font-bold text-cream-50">
                  Target Handover Countdown
                </h3>
              </div>
            </div>

            <div className="text-left sm:text-right bg-charcoal-900/70 px-4 py-2 rounded-2xl border border-charcoal-500 flex items-baseline gap-2 sm:block">
              <span className="font-mono text-3xl font-extrabold text-amberGold-400 tracking-wider">
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </span>
              <span className="text-[10px] text-cream-200/80 block uppercase font-mono">
                {remainingSeconds > 0 ? "Remaining in SLA" : "Arriving momentarily"}
              </span>
            </div>
          </div>

          {/* Live Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-charcoal-600 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, ((1200 - remainingSeconds) / 1200) * 100)
                  )}%`,
                }}
                className="h-full bg-gradient-to-r from-amberGold-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-1000"
              />
            </div>
            <div className="flex justify-between text-[10px] text-cream-300/80 font-mono">
              <span>Confirmed: {new Date(order.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>Target Delivery: ~20 Mins ({new Date(new Date(order.confirmedAt).getTime() + 20 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
            </div>
          </div>
        </div>
      )}

      {/* Delivered within SLA Notification Banner */}
      {order.status === "DELIVERED" && (
        <div className="bg-forest-50 border border-forest-300 text-forest-900 rounded-3xl p-5 shadow-subtle flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-forest-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm font-bold text-forest-800">
              Delivered within 20-Minute Express SLA!
            </h4>
            <p className="text-xs text-forest-700 mt-0.5">
              Order successfully handed over fresh at your doorstep at{" "}
              {new Date(order.deliveredAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
            </p>
          </div>
        </div>
      )}

      {/* 5-Stage Live Timeline Tracker */}
      {!isCancelled ? (
        <div className="bg-cream-50 rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold text-charcoal-700">
              Live Order Status
            </h2>
            <span className="text-xs font-medium text-amberGold-600 bg-amberGold-50 px-2.5 py-1 rounded-full border border-amberGold-200">
              Target ~20 Minutes in Mulbagal
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="relative">
            <div className="overflow-hidden h-1.5 mb-6 text-xs flex rounded-full bg-cream-200">
              <div
                style={{
                  width: `${Math.max(
                    10,
                    (Math.max(0, currentStageIndex) / (statusOrder.length - 1)) * 100
                  )}%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amberGold-500 transition-all duration-700"
              />
            </div>

            <div className="grid grid-cols-5 gap-1 text-center">
              {stages.map((stage, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage.key} className="space-y-1.5 flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-amberGold-500 text-charcoal-700 ring-4 ring-amberGold-200"
                          : isPassed
                          ? "bg-emerald-600 text-cream-50"
                          : "bg-cream-200 text-charcoal-400"
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs block font-medium leading-tight ${
                        isCurrent
                          ? "text-amberGold-700 font-bold"
                          : isPassed
                          ? "text-charcoal-700"
                          : "text-charcoal-400"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {stage.time && (
                      <span className="text-[10px] text-charcoal-400 font-mono block">
                        {new Date(stage.time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Delivery Agent Card if applicable */}
          {order.deliveryAssignment && (
            <div className="mt-4 p-4 rounded-2xl bg-cream-100/70 border border-cream-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-charcoal-500 text-cream-50">
                  <Bike className="w-5 h-5 text-amberGold-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider">
                    Assigned Delivery Partner
                  </span>
                  <p className="text-xs font-bold text-charcoal-700">
                    {order.deliveryAssignment.agent?.name || "Store Delivery Specialist"}
                  </p>
                  <p className="text-[11px] text-charcoal-500">
                    {order.deliveryAssignment.status === "STARTED"
                      ? "On the way with your package"
                      : "Assigned & preparing package"}
                  </p>
                </div>
              </div>
              {order.deliveryAssignment.agent?.mobile && (
                <a
                  href={`tel:${order.deliveryAssignment.agent.mobile}`}
                  className="p-2 rounded-xl bg-cream-200 hover:bg-cream-300 text-charcoal-700 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Rate Your Order Prompt (when DELIVERED) */}
          {order.status === "DELIVERED" && (
            <div className="p-5 rounded-2xl bg-amberGold-50 border border-amberGold-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-sm font-bold text-charcoal-700 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amberGold-600 fill-current" />
                  <span>How was your fresh chicken order?</span>
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  {order.review
                    ? `You rated this order ${order.review.rating} stars: "${order.review.comment || "Great service"}"`
                    : "Your verified feedback helps us maintain strict cutting and hygiene standards."}
                </p>
              </div>
              <Button
                variant="accent"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
              >
                {order.review ? "Update Rating" : "Rate Your Order"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-800 space-y-1">
          <h2 className="font-serif text-base font-bold">This Order Was Cancelled</h2>
          <p className="text-xs">
            Reason: {order.cancellationReason || "Cancelled by store administrator"}
          </p>
        </div>
      )}

      {/* Order Items & Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Items List */}
        <div className="md:col-span-7 bg-cream-50 rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-subtle space-y-4">
          <h3 className="font-serif text-base font-semibold text-charcoal-700 border-b border-cream-200 pb-3">
            Item Snapshot Details
          </h3>

          <div className="divide-y divide-cream-200 text-xs">
            {order.items.map((item: any) => {
              let customizations: any[] = [];
              if (item.customizationSnapshotJson) {
                try {
                  customizations = JSON.parse(item.customizationSnapshotJson);
                } catch {}
              }

              return (
                <div key={item.id} className="py-3 flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cream-100 border border-cream-200 shrink-0 shadow-2xs">
                      <ProductImage
                        src={item.product?.imageUrl}
                        alt={item.productNameSnapshot}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <span className="font-semibold text-charcoal-800 text-sm block">
                        {item.productNameSnapshot}
                      </span>
                      <span className="text-charcoal-500 block text-xs mt-0.5">
                        {item.quantity}x {item.variantNameSnapshot}
                      </span>
                      {customizations.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {customizations.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-cream-100 text-[10px] text-charcoal-600 border border-cream-200"
                            >
                              {c.option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-charcoal-800 text-sm shrink-0 pt-0.5">
                    ₹{(item.lineTotalMinor / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address & Financial Summary */}
        <div className="md:col-span-5 space-y-6">
          {/* Destination Address */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 shadow-subtle space-y-2">
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amberGold-600" />
              <span>Delivery Destination</span>
            </h4>
            <p className="text-xs font-semibold text-charcoal-700">
              {order.deliveryAddress?.label || "Home"}
            </p>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              {order.deliveryAddress?.addressLine}
            </p>
            <p className="text-[11px] text-charcoal-400">
              Mulbagal, Karnataka
            </p>
          </div>

          {/* Financial Summary */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 shadow-subtle space-y-3 text-xs">
            <h4 className="font-serif text-sm font-semibold text-charcoal-700 border-b border-cream-200 pb-2">
              Payment Summary
            </h4>

            <div className="flex justify-between text-charcoal-600">
              <span>Items Subtotal</span>
              <span className="font-mono">₹{(order.subtotalMinor / 100).toFixed(2)}</span>
            </div>

            {order.discountMinor > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount ({order.couponCodeSnapshot || "Coupon"})</span>
                <span className="font-mono">-₹{(order.discountMinor / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-charcoal-600">
              <span>Delivery Fee</span>
              <span className="font-mono">
                {order.deliveryFeeMinor === 0 ? "FREE" : `₹${(order.deliveryFeeMinor / 100).toFixed(2)}`}
              </span>
            </div>

            {order.codFeeMinor > 0 && (
              <div className="flex justify-between text-charcoal-600">
                <span>COD Surcharge</span>
                <span className="font-mono">₹{(order.codFeeMinor / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-cream-200 flex justify-between items-baseline text-sm font-bold text-charcoal-800">
              <span>Total Paid/Payable</span>
              <span className="font-mono text-base">₹{(order.totalMinor / 100).toFixed(2)}</span>
            </div>

            <div className="pt-1 text-[11px] text-charcoal-400 flex items-center justify-between">
              <span>Method: {order.payment?.method || "COD"}</span>
              <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                order.payment?.status === "COMPLETED"
                  ? "bg-emerald-100 text-emerald-800"
                  : order.payment?.status === "FAILED"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amberGold-100 text-amberGold-800"
              }`}>
                {order.payment?.status === "COMPLETED" ? "PAID / SUCCESS" : order.payment?.status === "FAILED" ? "FAILED" : "PENDING"}
              </span>
            </div>

            {order.payment?.status === "PENDING" && order.status !== "CANCELLED" && (
              <div className="pt-3 border-t border-cream-200 text-center">
                <p className="text-xs text-charcoal-600 font-medium">
                  Pay at doorstep upon delivery via Cash or UPI QR.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="Rate Your Fresh Chicken Order"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-2 text-center">
              Your Rating
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-amberGold-500 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating ? "fill-current" : "text-cream-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1">
              Comments (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="How was the meat tenderness, cutting style, and delivery speed?"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-cream-50 border border-cream-300 rounded-xl text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={submittingReview}
            className="w-full"
          >
            {reviewSuccess ? "Rating Saved!" : "Submit Feedback"}
          </Button>
        </form>
      </Modal>

      {/* Official Tax Invoice & Cash Receipt Modal */}
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
                    Farm Fresh Halal Meats & Daily Groceries
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
                    Date: {new Date(order.placedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-[11px] text-stone-700 font-semibold mt-0.5">
                    Order Status: <span className="uppercase text-emerald-800">{order.status}</span>
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
                    {displayInvoice.customer?.name || user?.name || "Customer"}
                  </p>
                  <p className="text-stone-600">
                    Mobile: {displayInvoice.customer?.mobile || user?.mobile || order.user?.mobile || "Not specified"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="font-bold text-stone-400 uppercase tracking-wider text-[10px]">
                    Delivery Destination:
                  </span>
                  <p className="text-stone-800 font-semibold mt-0.5">
                    {order.deliveryAddress?.houseFlat ? `${order.deliveryAddress.houseFlat}, ` : ""}
                    {order.deliveryAddress?.streetArea || order.deliveryAddress?.addressLine || "Mulbagal Town"}
                  </p>
                  <p className="text-stone-500">
                    Mulbagal, Karnataka {order.deliveryAddress?.pincode || "563131"}
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
                    <span>Total Amount:</span>
                    <span className="text-emerald-800">₹{(order.totalMinor / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500">
              Loading invoice details...
            </div>
          )}

          {/* Action Buttons: Print & Close */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInvoiceModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.print();
                }
              }}
              className="text-xs inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
