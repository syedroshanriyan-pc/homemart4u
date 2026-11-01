"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Bike,
  Shield,
  FileText,
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  X,
  CreditCard,
  XCircle,
} from "lucide-react";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const fetchOrderData = async () => {
    try {
      const [orderRes, agentsRes] = await Promise.all([
        fetch(`/api/orders/${orderId}`),
        fetch("/api/admin/delivery-agents"),
      ]);

      if (orderRes.ok) {
        const d = await orderRes.json();
        setOrder(d.order);
        if (d.order.deliveryAssignment?.agentUserId) {
          setSelectedAgentId(d.order.deliveryAssignment.agentUserId);
        }
      }

      if (agentsRes.ok) {
        const a = await agentsRes.json();
        setAgents(a.agents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (res.ok) {
        await fetchOrderData();
        setShowCancelPrompt(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update order status");
      }
    } catch {
      alert("Error updating order status");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignDelivery = async () => {
    if (!selectedAgentId) {
      alert("Please select a delivery partner to assign");
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/assign-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentUserId: selectedAgentId }),
      });
      if (res.ok) {
        await fetchOrderData();
        alert("Delivery partner assigned successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign delivery partner");
      }
    } catch {
      alert("Error assigning delivery partner");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoAssignSequence = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/auto-assign`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        await fetchOrderData();
        alert(data.message || "Assigned in sequence successfully!");
      } else {
        alert(data.error || "Failed to auto-assign partner");
      }
    } catch {
      alert("Error auto-assigning delivery partner");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePayment = async (newStatus: "COMPLETED" | "FAILED") => {
    if (!confirm(`Are you sure you want to mark this payment as ${newStatus}?`)) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchOrderData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update payment status");
      }
    } catch {
      alert("Error updating payment");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-charcoal-400">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-sm font-semibold text-charcoal-700">Order not found</p>
        <Link href="/admin/orders" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-xs transition">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 rounded-xl bg-cream-50 hover:bg-cream-200 border border-cream-200 text-charcoal-600 transition-colors inline-flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-charcoal-800">
                Order #{order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Placed on {new Date(order.placedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          </div>
        </div>

        {/* Status Lifecycle Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === "PLACED" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleUpdateStatus("CONFIRMED")}
              isLoading={isUpdating}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>Confirm Order</span>
            </Button>
          )}

          {order.status === "CONFIRMED" && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => handleUpdateStatus("PREPARING")}
              isLoading={isUpdating}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Move to Kitchen Prep</span>
            </Button>
          )}

          {order.status === "PREPARING" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
              <Bike className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                Dispatch & transit are managed by the assigned partner ({order.deliveryAssignment?.agent?.name || "Assigned in sequence"}). The rider marks Out for Delivery upon hub departure.
              </span>
            </div>
          )}

          {order.status === "OUT_FOR_DELIVERY" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <span>
                In transit with {order.deliveryAssignment?.agent?.name || "Delivery Partner"}. Doorstep handover & COD collection are confirmed by the partner in their portal.
              </span>
            </div>
          )}

          {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelPrompt(true)}
              className="text-xs"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Order Prompt Modal */}
      {showCancelPrompt && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Reason for Cancellation
            </h4>
            <button onClick={() => setShowCancelPrompt(false)} className="text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. Customer requested, stock shortage, address outside Mulbagal"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-cream-50 border border-red-300 rounded-xl text-charcoal-700 focus:outline-none"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleUpdateStatus("CANCELLED", cancelReason)}
              isLoading={isUpdating}
            >
              Confirm Cancellation
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancelPrompt(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Details + Delivery Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Item Snapshots & Customer Address */}
        <div className="lg:col-span-8 space-y-6">
          {/* Order Items */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 shadow-subtle space-y-4">
            <h3 className="font-serif text-base font-semibold text-charcoal-700 border-b border-cream-200 pb-3">
              Item Snapshots & Customizations
            </h3>

            <div className="divide-y divide-cream-100 text-xs">
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
                      <p className="font-bold text-sm text-charcoal-800">
                        {item.productNameSnapshot}
                      </p>
                      <p className="text-xs text-charcoal-500 mt-0.5">
                        {item.quantity}x {item.variantNameSnapshot}
                        {item.weightGrams ? ` &bull; ${item.weightGrams}g` : ""}
                      </p>
                      {customizations.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {customizations.map((c, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-cream-100 text-[10px] text-charcoal-600 border border-cream-200 font-medium"
                            >
                              {c.group ? `${c.group}: ` : ""}{c.option}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm text-charcoal-800">
                        ₹{(item.lineTotalMinor / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-charcoal-400">
                        (₹{(item.unitPriceMinor / 100).toFixed(2)} each)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {order.notes && (
              <div className="p-3 rounded-xl bg-amberGold-50 border border-amberGold-200 text-xs text-charcoal-700">
                <strong>Customer Delivery Note:</strong> {order.notes}
              </div>
            )}
          </div>

          {/* Delivery Destination Address */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 shadow-subtle space-y-3">
            <h3 className="font-serif text-base font-semibold text-charcoal-700 flex items-center gap-2 border-b border-cream-200 pb-3">
              <MapPin className="w-4 h-4 text-amberGold-600" />
              <span>Customer & Delivery Destination</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Customer</span>
                <p className="font-bold text-sm text-charcoal-800 mt-0.5">{order.user?.name}</p>
                <p className="text-charcoal-500 mt-0.5">Phone: {order.user?.mobile}</p>
                {order.user?.email && <p className="text-charcoal-500">{order.user?.email}</p>}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal-400 block">
                  Delivery Address ({order.deliveryAddress?.label || "Home"})
                </span>
                <p className="font-medium text-charcoal-700 mt-0.5 leading-relaxed">
                  {order.deliveryAddress?.addressLine}
                </p>
                <p className="text-charcoal-400 mt-0.5">
                  {order.deliveryAddress?.locality}, {order.deliveryAddress?.city} - {order.deliveryAddress?.postalCode || "563131"}
                </p>
                <p className="text-[11px] text-amberGold-600 mt-1 font-mono">
                  Coordinates: {order.deliveryLatitude.toFixed(4)}, {order.deliveryLongitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Delivery Assignment & Financial Bill Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          {/* Delivery Assignment Card */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-subtle space-y-4">
            <h3 className="font-serif text-base font-semibold text-charcoal-700 flex items-center gap-2 border-b border-cream-200 pb-3">
              <Bike className="w-4 h-4 text-amberGold-600" />
              <span>Assign Delivery Partner</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-600 mb-1">
                  Select Delivery Worker
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-cream-100 border border-cream-300 rounded-xl text-charcoal-700 focus:outline-none focus:ring-2 focus:ring-amberGold-400"
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.mobile}) - {ag.deliveryProfile?.availabilityStatus || "AVAILABLE"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoAssignSequence}
                  isLoading={isUpdating}
                  className="flex-1 text-[11px] bg-amberGold-50 border-amberGold-300 text-amberGold-900 hover:bg-amberGold-100"
                >
                  ⚡ Auto-Assign (Sequence)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAssignDelivery}
                  isLoading={isUpdating}
                  className="flex-1 text-[11px]"
                >
                  {order.deliveryAssignment ? "Reassign Manual" : "Assign Manual"}
                </Button>
              </div>

              {order.deliveryAssignment && (
                <div className="pt-2 text-xs text-charcoal-500">
                  <p><strong>Current:</strong> {order.deliveryAssignment.agent?.name}</p>
                  <p><strong>Assignment Status:</strong> {order.deliveryAssignment.status}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-subtle space-y-3 text-xs">
            <h3 className="font-serif text-base font-semibold text-charcoal-700 border-b border-cream-200 pb-2">
              Financial Summary
            </h3>

            <div className="flex justify-between text-charcoal-600">
              <span>Items Subtotal</span>
              <span className="font-mono">₹{(order.subtotalMinor / 100).toFixed(2)}</span>
            </div>

            {order.discountMinor > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon ({order.couponCodeSnapshot})</span>
                <span className="font-mono">-₹{(order.discountMinor / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-charcoal-600">
              <div>
                <span>Delivery Fee</span>
                <span className="text-[10px] text-charcoal-400 block">
                  ({(order.deliveryDistanceMeters / 1000).toFixed(1)} km)
                </span>
              </div>
              <span className="font-mono">
                {order.deliveryFeeMinor === 0 ? "FREE" : `₹${(order.deliveryFeeMinor / 100).toFixed(2)}`}
              </span>
            </div>

            {order.codFeeMinor > 0 && (
              <div className="flex justify-between text-charcoal-600">
                <span>COD Fee</span>
                <span className="font-mono">₹{(order.codFeeMinor / 100).toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-cream-200 flex justify-between items-baseline text-sm font-bold text-charcoal-800">
              <span>Grand Total</span>
              <span className="font-mono text-base">₹{(order.totalMinor / 100).toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-cream-100 flex items-center justify-between text-[11px] text-charcoal-500">
              <span>Payment Method: {order.payment?.method || "COD"}</span>
              <span className="font-medium text-charcoal-700 uppercase">
                {order.payment?.status || "PENDING"}
              </span>
            </div>
          </div>

          {/* Payment & Webhook Verification Live Card */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-subtle space-y-4">
            <h3 className="font-serif text-base font-semibold text-charcoal-700 flex items-center gap-2 border-b border-cream-200 pb-3">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment &amp; Webhook Status</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-charcoal-500">Current Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    order.payment?.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : order.payment?.status === "FAILED"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {order.payment?.status === "COMPLETED" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>SUCCESS / PAID</span>
                    </>
                  ) : order.payment?.status === "FAILED" ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>FAILED</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>PENDING VERIFICATION</span>
                    </>
                  )}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-cream-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-charcoal-400 font-sans">Payment Method:</span>
                  <span className="font-bold text-charcoal-700">{order.payment?.method || "COD"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400 font-sans">Payment Channel:</span>
                  <span className="font-bold text-charcoal-700">Razorpay / homemart4u Official</span>
                </div>
                {order.payment?.upiTxnRef && (
                  <div className="flex justify-between">
                    <span className="text-charcoal-400 font-sans">Transaction Ref / UTR:</span>
                    <span className="text-emerald-700 font-bold">{order.payment.upiTxnRef}</span>
                  </div>
                )}
                {order.payment?.providerReference && (
                  <div className="flex justify-between">
                    <span className="text-charcoal-400 font-sans">Provider Ref:</span>
                    <span className="text-charcoal-600">{order.payment.providerReference}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                {order.payment?.status !== "COMPLETED" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdatePayment("COMPLETED")}
                      disabled={isUpdating}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Paid &amp; Confirm Order</span>
                    </button>
                    {order.payment?.status !== "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleUpdatePayment("FAILED")}
                        disabled={isUpdating}
                        className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Mark as Failed / Expired</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] text-center font-medium flex items-center justify-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Payment locked &amp; confirmed in database</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
