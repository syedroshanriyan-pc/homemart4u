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
} from "lucide-react";
import { OrderDetailSkeleton } from "@/components/ui/Skeleton";
import { DynamicPaymentModal } from "@/components/payment/DynamicPaymentModal";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);

  // Dynamic Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // 20-Minute Live Delivery Countdown Timer State
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // 3-Minute Cancellation Window Timer State
  const [cancelSecondsRemaining, setCancelSecondsRemaining] = useState<number | null>(null);

  const isPrepaidOrder = Boolean(
    order?.payment && (order.payment.method !== "COD" || order.payment.status === "COMPLETED")
  );

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
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setOrder(data.order || null);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Order not found");
      }
    } catch {
      setErrorMsg("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Customer requested cancellation" }),
      });
      if (res.ok) {
        await fetchOrder();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Unable to cancel order");
      }
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
      const res = await fetch(`/api/orders/${order.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: reviewComment }),
      });
      if (res.ok) {
        setReviewSuccess(true);
        await fetchOrder();
        setTimeout(() => setIsReviewModalOpen(false), 1200);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to submit review");
      }
    } catch {
      alert("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenInvoice = async () => {
    if (!order?.id) return;
    setIsInvoiceModalOpen(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setInvoiceData(data.invoice || null);
      }
    } catch {}
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
                  <div>
                    <span className="font-semibold text-charcoal-800 text-sm">
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
                  <span className="font-mono font-bold text-charcoal-800 text-sm">
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
              <div className="pt-3 border-t border-cream-200">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  Pay via Dynamic QR / GPay / PhonePe
                </Button>
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

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={`Invoice: INV-${order.orderNumber}`}
        maxWidth="lg"
      >
        {invoiceData ? (
          <div className="space-y-5 text-xs font-sans text-charcoal-700 p-2">
            <div className="flex justify-between items-start border-b border-cream-200 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-800">
                  {invoiceData.shop.name}
                </h3>
                <p className="text-[11px] text-charcoal-500">{invoiceData.shop.tagline}</p>
                <p className="text-[11px] text-charcoal-400 mt-1">{invoiceData.shop.address}</p>
                <p className="text-[11px] text-charcoal-400">Phone: {invoiceData.shop.phone}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm text-charcoal-800">
                  {invoiceData.invoiceNumber}
                </span>
                <p className="text-[11px] text-charcoal-400 mt-0.5">
                  Date: {new Date(invoiceData.date).toLocaleDateString("en-IN")}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {invoiceData.summary.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-cream-100/70 p-3 rounded-xl border border-cream-200">
              <p className="font-bold text-charcoal-800">{invoiceData.customer.name}</p>
              <p className="text-charcoal-500">Mobile: {invoiceData.customer.mobile}</p>
              <p className="text-charcoal-500 mt-0.5">{invoiceData.customer.address?.addressLine}, Mulbagal</p>
            </div>

            {/* Itemized Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-cream-200 text-[11px] text-charcoal-400 uppercase">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {invoiceData.items.map((it: any, idx: number) => (
                  <tr key={idx} className="py-2">
                    <td className="py-2 font-medium">{it.productName} ({it.variantName})</td>
                    <td className="py-2 text-center font-mono">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">₹{it.unitPriceRs}</td>
                    <td className="py-2 text-right font-mono font-semibold">₹{it.lineTotalRs}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bill Summary */}
            <div className="border-t border-cream-200 pt-3 space-y-1.5 text-right font-mono">
              <p>Subtotal: ₹{invoiceData.summary.subtotalRs}</p>
              {parseFloat(invoiceData.summary.discountRs) > 0 && (
                <p className="text-emerald-700">Discount: -₹{invoiceData.summary.discountRs}</p>
              )}
              <p>Delivery: ₹{invoiceData.summary.deliveryFeeRs}</p>
              {parseFloat(invoiceData.summary.codFeeRs) > 0 && (
                <p>COD Fee: ₹{invoiceData.summary.codFeeRs}</p>
              )}
              <p className="text-sm font-bold text-charcoal-800 pt-1 border-t border-cream-200">
                Total: ₹{invoiceData.summary.totalRs}
              </p>
            </div>

            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-charcoal-400 py-4 text-center">Loading invoice...</p>
        )}
      </Modal>

      {/* Dynamic Payment Modal */}
      {order && isPaymentModalOpen && (
        <DynamicPaymentModal
          isOpen={isPaymentModalOpen}
          orderId={order.id}
          orderNumber={order.orderNumber}
          amountRupees={order.totalMinor / 100}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            fetchOrder();
          }}
        />
      )}
    </div>
  );
}
