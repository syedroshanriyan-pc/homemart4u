"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRealTime } from "@/lib/useRealTime";
import {
  Search,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  CreditCard,
  Banknote,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function AdminOrdersListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = "/api/admin/orders";
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedPaymentStatus !== "ALL") params.append("paymentStatus", selectedPaymentStatus);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, selectedPaymentStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleManualPurge = async () => {
    if (!confirm("Delete all order and payment records older than 48 hours (past 2 days)?")) return;
    setIsPurging(true);
    setFeedbackMsg("");
    try {
      const res = await fetch("/api/admin/orders", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setFeedbackMsg(data.message || `Purged ${data.deletedCount} old records.`);
        fetchOrders();
      } else {
        setFeedbackMsg(data.error || "Failed to purge old records.");
      }
    } catch {
      setFeedbackMsg("Network error purging old records.");
    } finally {
      setIsPurging(false);
      setTimeout(() => setFeedbackMsg(""), 4000);
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const statusFilters = [
    { label: "All Fulfillment", key: "ALL" },
    { label: "Placed / New", key: "PLACED" },
    { label: "Confirmed", key: "CONFIRMED" },
    { label: "Preparing", key: "PREPARING" },
    { label: "Out for Delivery", key: "OUT_FOR_DELIVERY" },
    { label: "Delivered", key: "DELIVERED" },
    { label: "Cancelled", key: "CANCELLED" },
  ];

  const paymentFilters = [
    { label: "All Payments", key: "ALL", icon: CreditCard },
    { label: "Success / Paid", key: "SUCCESS", icon: CheckCircle2 },
    { label: "Pending", key: "PENDING", icon: Clock },
    { label: "Failed / Declined", key: "FAILED", icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Past 2-Day Retention Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Past 2 Days Active Records &bull; Older Records Auto-Purged</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-800">
            Order & Payment Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time live monitoring of customer orders, dynamic UPI QR/app transactions, and delivery fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualPurge}
            isLoading={isPurging}
            className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center gap-1.5"
            title="Clean records older than 48 hours"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Purge &gt;48h Old</span>
          </Button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-medium animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* KPI Cards for Past 2 Days */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            Past 2 Days Orders
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-stone-800">
              {stats?.total ?? orders.length}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">Last 48 Hours</span>
          </div>
        </div>

        {/* Success / Paid */}
        <div
          onClick={() => setSelectedPaymentStatus("SUCCESS")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-subtle transition-all hover:scale-[1.01] ${
            selectedPaymentStatus === "SUCCESS"
              ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/30"
              : "border-stone-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Payment Success
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-emerald-700">
              {stats?.successCount ?? 0}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
          </div>
        </div>

        {/* Pending Payments */}
        <div
          onClick={() => setSelectedPaymentStatus("PENDING")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-subtle transition-all hover:scale-[1.01] ${
            selectedPaymentStatus === "PENDING"
              ? "border-amber-500 ring-2 ring-amber-200 bg-amber-50/30"
              : "border-stone-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Payment Pending
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-amber-700">
              {stats?.pendingCount ?? 0}
            </span>
            <span className="text-[10px] text-amber-600 font-medium">Awaiting UPI/COD</span>
          </div>
        </div>

        {/* Failed Payments */}
        <div
          onClick={() => setSelectedPaymentStatus("FAILED")}
          className={`cursor-pointer bg-white rounded-2xl border p-4 shadow-subtle transition-all hover:scale-[1.01] ${
            selectedPaymentStatus === "FAILED"
              ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/30"
              : "border-stone-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Payment Failed
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-rose-700">
              {stats?.failedCount ?? 0}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">Declined</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-subtle">
        {/* Payment Status Tabs */}
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1.5">
            Filter by Payment Status:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {paymentFilters.map((pf) => {
              const Icon = pf.icon;
              return (
                <button
                  key={pf.key}
                  onClick={() => setSelectedPaymentStatus(pf.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedPaymentStatus === pf.key
                      ? "bg-stone-800 text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{pf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fulfillment Status Pills */}
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-1.5">
            Filter by Order Fulfillment:
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedStatus(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedStatus === f.key
                    ? "bg-amber-600 text-white font-semibold shadow-sm"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by order number (FC-1001), customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
            Loading live orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-semibold">
              No orders found matching the filter for the past 2 days.
            </p>
            <p className="text-[11px] text-stone-400">
              Older records (&gt;48h) are automatically removed to keep your order board fast and clean.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase text-stone-500 font-semibold">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Time Placed</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Amount & Method</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Order Status</th>
                  <th className="py-3.5 px-4">Delivery Partner</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((ord) => {
                  const placedStr = new Date(ord.placedAt).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Kolkata",
                  });

                  const paymentStatus = ord.payment?.status || "PENDING";
                  const isSuccess = paymentStatus === "COMPLETED";
                  const isFailed = paymentStatus === "FAILED";

                  return (
                    <tr key={ord.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-stone-800">
                        #{ord.orderNumber}
                      </td>

                      {/* Time Placed */}
                      <td className="py-3 px-4 text-stone-500 text-[11px] whitespace-nowrap">
                        {placedStr}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-stone-800 block">{ord.user?.name}</span>
                        <span className="text-[10px] text-stone-400 font-mono">{ord.user?.mobile}</span>
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 text-stone-600 max-w-xs truncate">
                        {ord.items.map((i: any) => `${i.quantity}x ${i.productNameSnapshot}`).join(", ")}
                      </td>

                      {/* Amount & Method */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-stone-800 block">
                          ₹{(ord.totalMinor / 100).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-stone-500 uppercase flex items-center gap-1">
                          {ord.payment?.method === "COD" ? (
                            <>
                              <Banknote className="w-3 h-3 text-amber-600" />
                              <span>Cash on Delivery</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              <span>UPI / Dynamic QR</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Explicit Payment Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isSuccess
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isFailed
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {isSuccess ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Success / Paid</span>
                              </>
                            ) : isFailed ? (
                              <>
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Failed</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </>
                            )}
                          </span>

                          {/* Quick Admin Toggle Dropdown */}
                          <div className="flex gap-1 pt-0.5">
                            {!isSuccess && (
                              <button
                                onClick={() => handleUpdatePaymentStatus(ord.id, "COMPLETED")}
                                className="text-[9px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 transition"
                                title="Mark as Success"
                              >
                                ✓ Paid
                              </button>
                            )}
                            {!isFailed && (
                              <button
                                onClick={() => handleUpdatePaymentStatus(ord.id, "FAILED")}
                                className="text-[9px] px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition"
                                title="Mark as Failed"
                              >
                                ✕ Fail
                              </button>
                            )}
                            {paymentStatus !== "PENDING" && (
                              <button
                                onClick={() => handleUpdatePaymentStatus(ord.id, "PENDING")}
                                className="text-[9px] px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 transition"
                                title="Mark as Pending"
                              >
                                ⏳ Pending
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Order Fulfillment Status */}
                      <td className="py-3 px-4">
                        <OrderStatusBadge status={ord.status} />
                      </td>

                      {/* Delivery Partner */}
                      <td className="py-3 px-4 text-stone-600">
                        {ord.deliveryAssignment?.agent?.name ? (
                          <span className="font-medium text-stone-700">
                            {ord.deliveryAssignment.agent.name}
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link href={`/admin/orders/${ord.id}`} className="inline-flex items-center justify-center px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-xs shadow-sm transition"><span>Manage</span></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
