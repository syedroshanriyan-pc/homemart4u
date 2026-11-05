"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  Bike,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  PackageX,
  ArrowRight,
  RefreshCw,
  Banknote,
  QrCode,
  ShieldCheck,
  CreditCard,
  Layers,
  Store,
  Tag,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { useRealTime } from "@/lib/useRealTime";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      const res = await fetch("/api/admin/dashboard", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson.error || `Unable to load metrics (HTTP ${res.status})`);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || "Failed to connect to backend service");
    } finally {
      setLoading(false);
    }
  };

  // Real-time SSE listener backed by /api/events with auto-reconnect & 60s bounded fallback
  useRealTime({
    channels: ["admin"],
    onRefresh: fetchDashboardData,
    fallbackIntervalMs: 60000,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !data) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-amberGold-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-charcoal-500 font-mono">Loading real-time operational metrics...</p>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="py-16 max-w-md mx-auto text-center space-y-4 bg-cream-50 p-6 rounded-2xl border border-cream-200">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-base font-bold text-charcoal-800">Operational Metrics Unavailable</h3>
        <p className="text-xs text-charcoal-500 leading-relaxed">{errorMessage}</p>
        <Button variant="primary" size="sm" onClick={fetchDashboardData} className="mx-auto">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry Connection
        </Button>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const alerts = data?.alerts || {};
  const statusMap = metrics.statusMap || {};

  return (
    <div className="space-y-8">
      {/* Header with Real-Time Indicator & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-charcoal-800">
              Operations Overview
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live SSE Active
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Real-time sales, order lifecycle, and persisted doorstep cash vs UPI collections.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-50 border border-cream-200 text-xs text-charcoal-600 hover:bg-cream-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amberGold-600" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Store Operating Status Control Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-subtle transition-all ${
        (metrics.store_status || "OPEN") === "OPEN"
          ? "bg-emerald-50/70 border-emerald-300"
          : "bg-rose-50/70 border-rose-300"
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${
            (metrics.store_status || "OPEN") === "OPEN"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-800"
          }`}>
            <span className={`w-3 h-3 rounded-full block animate-pulse ${
              (metrics.store_status || "OPEN") === "OPEN" ? "bg-emerald-600" : "bg-rose-600"
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-charcoal-900">
                Store Status: {(metrics.store_status || "OPEN") === "OPEN" ? "OPEN & ACCEPTING ORDERS" : "CLOSED (ORDERING PAUSED)"}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                (metrics.store_status || "OPEN") === "OPEN"
                  ? "bg-emerald-200/60 text-emerald-900"
                  : "bg-rose-200/60 text-rose-900"
              }`}>
                {(metrics.store_status || "OPEN") === "OPEN" ? "Live Ordering Enabled" : "Checkout Blocked"}
              </span>
            </div>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {(metrics.store_status || "OPEN") === "OPEN"
                ? "Customers can add items to cart, browse, and place new Cash on Delivery orders."
                : "Customers can browse products, but checkout and API order creation are blocked."}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            const nextStatus = (metrics.store_status || "OPEN") === "OPEN" ? "CLOSED" : "OPEN";
            const confirmMsg = nextStatus === "CLOSED"
              ? "Are you sure you want to CLOSE the store? Order creation will be blocked."
              : "Are you sure you want to OPEN the store and accept new orders?";
            if (!window.confirm(confirmMsg)) return;

            try {
              const res = await fetch("/api/admin/store-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
              });
              if (res.ok) {
                fetchDashboardData();
              }
            } catch (e) {
              console.error(e);
            }
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
            (metrics.store_status || "OPEN") === "OPEN"
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {(metrics.store_status || "OPEN") === "OPEN" ? "Close Store Now" : "Open Store Now"}
        </button>
      </div>

      {/* Real-Time Catalogue & Storefront Management Overview (8 Metrics Grid) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase font-bold tracking-wider text-charcoal-500">
            Storefront &amp; Catalogue Overview
          </h2>
          <span className="text-[11px] text-charcoal-400 font-mono">
            Direct from PostgreSQL
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Total Products */}
          <Link
            href="/admin/products"
            className="bg-white p-4 rounded-2xl border border-cream-200 shadow-subtle hover:border-cream-300 transition block group"
          >
            <div className="flex items-center justify-between text-charcoal-400 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-charcoal-600">Total Products</span>
              <Package className="w-4 h-4 text-charcoal-500 group-hover:text-amberGold-600 transition" />
            </div>
            <span className="font-serif text-2xl font-bold text-charcoal-900 block">
              {metrics.totalProducts ?? 0}
            </span>
            <span className="text-[10px] text-charcoal-400 mt-0.5 block truncate">
              {metrics.activeProducts ?? 0} active in catalogue
            </span>
          </Link>

          {/* Available Products */}
          <Link
            href="/admin/products"
            className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-subtle hover:border-emerald-300 transition block group"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Available (In Stock)</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-serif text-2xl font-bold text-emerald-900 block">
              {metrics.availableProducts ?? 0}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block truncate">
              Ready for immediate order
            </span>
          </Link>

          {/* Unavailable Products */}
          <Link
            href="/admin/products"
            className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/80 shadow-subtle hover:border-rose-300 transition block group"
          >
            <div className="flex items-center justify-between text-rose-700 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Unavailable Items</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="font-serif text-2xl font-bold text-rose-900 block">
              {metrics.unavailableProducts ?? 0}
            </span>
            <span className="text-[10px] text-rose-700 mt-0.5 block truncate">
              {metrics.outOfStockProductsCount ?? 0} marked out of stock
            </span>
          </Link>

          {/* Total Categories */}
          <Link
            href="/admin/categories"
            className="bg-white p-4 rounded-2xl border border-cream-200 shadow-subtle hover:border-cream-300 transition block group"
          >
            <div className="flex items-center justify-between text-charcoal-400 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-charcoal-600">Total Categories</span>
              <Layers className="w-4 h-4 text-amberGold-600 group-hover:scale-105 transition" />
            </div>
            <span className="font-serif text-2xl font-bold text-charcoal-900 block">
              {metrics.totalCategories ?? 0}
            </span>
            <span className="text-[10px] text-charcoal-400 mt-0.5 block truncate">
              Meat &amp; Grocery departments
            </span>
          </Link>

          {/* Active Promotional Cards */}
          <Link
            href="/admin/content"
            className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 shadow-subtle hover:border-amber-300 transition block group"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Promo Cards</span>
              <Tag className="w-4 h-4 text-amber-600" />
            </div>
            <span className="font-serif text-2xl font-bold text-amber-900 block">
              {metrics.activePromotionalCards ?? 0}
            </span>
            <span className="text-[10px] text-amber-700 mt-0.5 block truncate">
              Published on customer homepage
            </span>
          </Link>

          {/* Store Operating Status */}
          <Link
            href="/admin/settings"
            className="bg-white p-4 rounded-2xl border border-cream-200 shadow-subtle hover:border-cream-300 transition block group"
          >
            <div className="flex items-center justify-between text-charcoal-400 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-charcoal-600">Store Status</span>
              <Store className="w-4 h-4 text-charcoal-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                (metrics.store_status || "OPEN") === "OPEN" ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`} />
              <span className={`font-serif text-xl sm:text-2xl font-bold ${
                (metrics.store_status || "OPEN") === "OPEN" ? "text-emerald-700" : "text-rose-700"
              }`}>
                {metrics.store_status || "OPEN"}
              </span>
            </div>
            <span className="text-[10px] text-charcoal-400 mt-0.5 block truncate">
              {(metrics.store_status || "OPEN") === "OPEN" ? "Accepting customer orders" : "Ordering paused"}
            </span>
          </Link>

          {/* Pending Orders */}
          <Link
            href="/admin/orders?status=PENDING"
            className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80 shadow-subtle hover:border-blue-300 transition block group"
          >
            <div className="flex items-center justify-between text-blue-700 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Pending Orders</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-serif text-2xl font-bold text-blue-900 block">
              {metrics.pendingOrders ?? metrics.pendingDeliveries ?? 0}
            </span>
            <span className="text-[10px] text-blue-700 mt-0.5 block truncate">
              Placed, preparing or in transit
            </span>
          </Link>

          {/* Delivered Orders */}
          <Link
            href="/admin/orders?status=DELIVERED"
            className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 shadow-subtle hover:border-emerald-300 transition block group"
          >
            <div className="flex items-center justify-between text-emerald-700 mb-1.5">
              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Delivered Orders</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-serif text-2xl font-bold text-emerald-900 block">
              {metrics.completedOrders ?? metrics.deliveredOrders ?? 0}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block truncate">
              Successfully fulfilled
            </span>
          </Link>
        </div>
      </div>

      {/* 1. Core KPI Metric Cards (Strictly Persisted Delivery Collections & Live Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Today Sales */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Today Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ₹{((metrics.todaySalesMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">
            {metrics.todayOrderCount || 0} orders today
          </span>
        </div>

        {/* COD Cash Amount Box */}
        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">COD Cash Amount</span>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-amber-900">
              ₹{((metrics.todayCodSalesMinor || metrics.cashCollectedMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 block truncate font-medium">
            {metrics.todayCodOrderCount || 0} COD orders to collect
          </span>
        </div>

        {/* Online Paid Amount Box / Doorstep UPI */}
        <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Online Paid Amount</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-900">
              ₹{((metrics.todayOnlineSalesMinor || metrics.upiManualConfirmedMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 block truncate font-medium">
            {metrics.todayOnlineOrderCount || 0} UPI manually verified
          </span>
        </div>

        {/* Total Doorstep Collections */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Total Collected</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ₹{((metrics.totalCollectionsMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">
            Cash + UPI confirmed
          </span>
        </div>

        {/* Outstanding Uncollected COD */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Outstanding COD</span>
            <Clock className="w-4 h-4 text-amberGold-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ₹{((metrics.outstandingCollectionMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">Pending handover</span>
        </div>

        {/* Delivery Progress */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Deliveries</span>
            <Bike className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              {metrics.deliveredOrders || 0}
            </span>
            <span className="text-xs text-charcoal-500 font-mono">
              / {metrics.pendingDeliveries || 0} active
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">
            {metrics.deliveredOrders || 0} delivered
          </span>
        </div>
      </div>

      {/* 2. Order Lifecycle Status Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Pending / Placed</span>
          <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
            {statusMap.PLACED || 0}
          </span>
        </div>

        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Confirmed</span>
          <span className="text-xl font-bold font-mono text-amber-700 block mt-1">
            {statusMap.CONFIRMED || 0}
          </span>
        </div>

        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Preparing</span>
          <span className="text-xl font-bold font-mono text-amber-600 block mt-1">
            {statusMap.PREPARING || 0}
          </span>
        </div>

        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Out for Delivery</span>
          <span className="text-xl font-bold font-mono text-purple-700 block mt-1">
            {statusMap.OUT_FOR_DELIVERY || 0}
          </span>
        </div>

        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Delivered</span>
          <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
            {statusMap.DELIVERED || 0}
          </span>
        </div>

        <div className="bg-cream-50 p-4 rounded-xl border border-cream-200 text-center">
          <span className="text-[10px] uppercase font-semibold text-charcoal-400 block">Cancelled</span>
          <span className="text-xl font-bold font-mono text-red-700 block mt-1">
            {statusMap.CANCELLED || 0}
          </span>
        </div>
      </div>

      {/* 3. Operational Action Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unassigned Deliveries Alert */}
        <div className="bg-cream-50 p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold text-charcoal-700 flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-amberGold-600" />
              <span>Unassigned Deliveries</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {alerts.unassignedOrders?.length || 0}
            </span>
          </div>

          {alerts.unassignedOrders?.length > 0 ? (
            <div className="divide-y divide-cream-100 text-xs">
              {alerts.unassignedOrders.map((ord: any) => (
                <div key={ord.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-charcoal-800">#{ord.orderNumber}</span>
                    <span className="text-[11px] text-charcoal-400 block">{ord.user?.name}</span>
                  </div>
                  <Link href={`/admin/orders/${ord.id}`} className="inline-flex items-center justify-center px-2 py-1 rounded-xl border border-amberGold-300 bg-amberGold-50 hover:bg-amberGold-100 text-charcoal-800 font-bold text-[11px] transition">Assign</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-charcoal-400 py-3 text-center">
              All active orders have delivery agents assigned.
            </p>
          )}
        </div>

        {/* Approaching 20-min target alert */}
        <div className="bg-cream-50 p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold text-charcoal-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Orders &gt;15 Mins</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {alerts.targetAtRiskOrders?.length || 0}
            </span>
          </div>

          {alerts.targetAtRiskOrders?.length > 0 ? (
            <div className="divide-y divide-cream-100 text-xs">
              {alerts.targetAtRiskOrders.map((ord: any) => (
                <div key={ord.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-charcoal-800">#{ord.orderNumber}</span>
                    <span className="text-[10px] text-red-600 block">Approaching 20m target</span>
                  </div>
                  <OrderStatusBadge status={ord.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-charcoal-400 py-3 text-center">
              All active orders are on schedule.
            </p>
          )}
        </div>

        {/* Out of Stock Products */}
        <div className="bg-cream-50 p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold text-charcoal-700 flex items-center gap-1.5">
              <PackageX className="w-4 h-4 text-charcoal-500" />
              <span>Out of Stock Items</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-200 text-stone-700">
              {alerts.outOfStockProducts?.length || 0}
            </span>
          </div>

          {alerts.outOfStockProducts?.length > 0 ? (
            <div className="divide-y divide-cream-100 text-xs">
              {alerts.outOfStockProducts.map((p: any) => (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-charcoal-800 truncate block max-w-[140px]">{p.name}</span>
                    <span className="text-[10px] text-charcoal-400">{p.category?.name}</span>
                  </div>
                  <Link href="/admin/inventory" className="inline-flex items-center justify-center px-2 py-1 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-[11px] transition">Restock</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-charcoal-400 py-3 text-center">
              All catalog products are in stock.
            </p>
          )}
        </div>
      </div>

      {/* 4. Recent Orders Table */}
      <div className="bg-cream-50 rounded-2xl border border-cream-200 shadow-subtle p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            Recent Orders
          </h3>
          <Link href="/admin/orders" className="text-xs font-semibold text-amberGold-600 hover:underline">
            View All Orders &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-cream-200 text-[11px] uppercase text-charcoal-400">
                <th className="py-3 px-2">Order #</th>
                <th className="py-3 px-2">Customer</th>
                <th className="py-3 px-2">Items</th>
                <th className="py-3 px-2">Total</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Delivery Agent</th>
                <th className="py-3 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {data?.recentOrders?.map((ord: any) => (
                <tr key={ord.id} className="hover:bg-cream-100/60 transition-colors">
                  <td className="py-3 px-2 font-mono font-bold text-charcoal-800">
                    #{ord.orderNumber}
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-semibold text-charcoal-700 block">{ord.user?.name}</span>
                    <span className="text-[10px] text-charcoal-400">{ord.user?.mobile}</span>
                  </td>
                  <td className="py-3 px-2 text-charcoal-600">
                    {ord.items?.length || 0} item(s)
                  </td>
                  <td className="py-3 px-2 font-mono font-bold text-charcoal-800">
                    ₹{(ord.totalMinor / 100).toFixed(0)}
                  </td>
                  <td className="py-3 px-2">
                    <OrderStatusBadge status={ord.status} />
                  </td>
                  <td className="py-3 px-2 text-charcoal-600">
                    {ord.deliveryAssignment?.agent?.name || (
                      <span className="text-charcoal-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Link href={`/admin/orders/${ord.id}`} className="inline-flex items-center justify-center px-2.5 py-1 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-xs transition">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
