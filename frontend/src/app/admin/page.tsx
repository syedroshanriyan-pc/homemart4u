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
  CreditCard,
} from "lucide-react";

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

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s refresh
    return () => clearInterval(interval);
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
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-charcoal-800">
            Operations Overview
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Real-time sales, order lifecycle statuses, and cash vs online payment reconciliation.
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

      {/* 1. Core KPI Metric Cards (With Dedicated COD vs Online Boxes) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Today Sales */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Total Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ₹{((metrics.todaySalesMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">Total today active</span>
        </div>

        {/* Cash on Delivery (COD) Amount Box */}
        <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">COD Cash Amount</span>
            <Banknote className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-amber-900">
              ₹{((metrics.todayCodSalesMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 block truncate font-medium">
            {metrics.todayCodOrderCount || 0} COD orders to collect
          </span>
        </div>

        {/* Online Paid Amount Box */}
        <div className="bg-emerald-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Online Paid Amount</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-900">
              ₹{((metrics.todayOnlineSalesMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 block truncate font-medium">
            {metrics.todayOnlineOrderCount || 0} UPI / Bank verified
          </span>
        </div>

        {/* Today's Orders */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Orders Today</span>
            <ShoppingBag className="w-4 h-4 text-amberGold-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              {metrics.todayOrderCount || 0}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">Total orders placed</span>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Average Order</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ₹{((metrics.aovMinor || 0) / 100).toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">Avg ticket size</span>
        </div>

        {/* Target 20-min Delivery */}
        <div className="bg-cream-50 p-4 sm:p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-charcoal-400">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider">Target Window</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal-800">
              ~20 Min
            </span>
          </div>
          <span className="text-[10px] text-charcoal-400 block truncate">Mulbagal standard</span>
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
                  <Link href={`/admin/orders/${ord.id}`}>
                    <Button variant="outline" size="sm" className="text-[11px] px-2 py-1">
                      Assign
                    </Button>
                  </Link>
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
                  <Link href="/admin/inventory">
                    <Button variant="outline" size="sm" className="text-[11px] px-2 py-1">
                      Restock
                    </Button>
                  </Link>
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
                    <Link href={`/admin/orders/${ord.id}`}>
                      <Button variant="outline" size="sm" className="text-xs px-2.5 py-1">
                        Manage
                      </Button>
                    </Link>
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
