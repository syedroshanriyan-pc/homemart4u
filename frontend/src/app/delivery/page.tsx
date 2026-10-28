"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bike,
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
  Package,
  RefreshCw,
  QrCode,
  CreditCard,
} from "lucide-react";
import { formatCurrency } from "@/lib/delivery";

interface Assignment {
  id: string;
  status: "ASSIGNED" | "STARTED" | "DELIVERED" | "CANCELLED";
  assignedAt: string;
  startedAt: string | null;
  deliveredAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalMinor: number;
    deliveryAddressSnapshot: string;
    codFeeMinor?: number;
    paymentMethod?: string;
    payment?: {
      method?: string;
      status: string;
    } | null;
    deliveryCollection?: {
      collectionMethod: "CASH" | "ONLINE_DOORSTEP" | "PREPAID" | "UPI_MANUAL_VERIFIED" | string;
      verificationStatus: string;
      amountMinor: number;
    } | null;
    placedAt: string;
    user: {
      name: string;
      mobile: string;
    };
    items: {
      id: string;
      productName: string;
      variantName: string;
      quantity: number;
      weightGrams: number;
    }[];
  };
}

export default function DeliveryDashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "CASH" | "ONLINE">("ALL");

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/delivery/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const activeRuns = assignments.filter((a) => a.status === "ASSIGNED" || a.status === "STARTED");
  const completedRuns = assignments.filter((a) => a.status === "DELIVERED");

  // Dynamic metrics from server or local fallback
  const totalCashCollectedMinor =
    stats?.cashCollectedMinor ??
    completedRuns
      .filter((a) => a.order.deliveryCollection?.collectionMethod === "CASH")
      .reduce((sum, a) => sum + (a.order.deliveryCollection?.amountMinor || a.order.totalMinor || 0), 0);

  const totalOnlineDoorstepMinor =
    stats?.onlineDoorstepMinor ??
    stats?.upiManualConfirmedMinor ??
    completedRuns
      .filter((a) => a.order.deliveryCollection?.collectionMethod === "UPI_MANUAL_VERIFIED" || a.order.deliveryCollection?.collectionMethod === "ONLINE_DOORSTEP")
      .reduce((sum, a) => sum + (a.order.deliveryCollection?.amountMinor || a.order.totalMinor || 0), 0);

  // Apply active/completed tab then payment filter
  const currentTabRuns = tab === "ACTIVE" ? activeRuns : completedRuns;
  const filteredRuns = currentTabRuns.filter((a) => {
    const isCodOrder =
      a.order.payment?.method === "COD" ||
      (a.order.codFeeMinor || 0) > 0 ||
      a.order.paymentMethod === "COD";

    if (paymentFilter === "ALL") return true;
    if (paymentFilter === "CASH") {
      // Either original COD and not yet paid online, or collected as cash
      return (
        a.order.deliveryCollection?.collectionMethod === "CASH" ||
        (isCodOrder && a.order.deliveryCollection?.collectionMethod !== "ONLINE_DOORSTEP")
      );
    }
    if (paymentFilter === "ONLINE") {
      // Either prepaid online, or converted to online at doorstep
      return (
        !isCodOrder ||
        a.order.deliveryCollection?.collectionMethod === "ONLINE_DOORSTEP" ||
        a.order.payment?.status === "COMPLETED"
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-10">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-cream-300 shadow-subtle text-center">
          <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">
            Active Runs
          </span>
          <span className="text-xl font-mono font-bold text-crimson-600 mt-1 block">
            {activeRuns.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-cream-300 shadow-subtle text-center">
          <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">
            Delivered Today
          </span>
          <span className="text-xl font-mono font-bold text-forest-600 mt-1 block">
            {completedRuns.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-cream-300 shadow-subtle text-center">
          <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">
            Cash Remittance
          </span>
          <span className="text-xl font-mono font-bold text-amberGold-700 mt-1 block">
            {formatCurrency(totalCashCollectedMinor)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-cream-300 shadow-subtle text-center">
          <span className="text-[10px] uppercase font-bold text-charcoal-400 block tracking-wider">
            Doorstep Online QR
          </span>
          <span className="text-xl font-mono font-bold text-blue-600 mt-1 block">
            {formatCurrency(totalOnlineDoorstepMinor)}
          </span>
        </div>
      </div>

      {/* Tabs & Payment Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("ACTIVE")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                tab === "ACTIVE"
                  ? "bg-charcoal-700 text-cream-50 shadow-subtle"
                  : "bg-cream-200 text-charcoal-600 hover:bg-cream-300"
              }`}
            >
              Active Runs ({activeRuns.length})
            </button>
            <button
              onClick={() => setTab("COMPLETED")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                tab === "COMPLETED"
                  ? "bg-charcoal-700 text-cream-50 shadow-subtle"
                  : "bg-cream-200 text-charcoal-600 hover:bg-cream-300"
              }`}
            >
              History ({completedRuns.length})
            </button>
          </div>

          <button
            onClick={fetchAssignments}
            className="p-2 bg-cream-200 hover:bg-cream-300 rounded-xl text-charcoal-600 transition"
            title="Refresh assignments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Payment Type Filters */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase text-charcoal-400 tracking-wider mr-1">
            Filter:
          </span>
          <button
            onClick={() => setPaymentFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
              paymentFilter === "ALL"
                ? "bg-charcoal-800 text-white"
                : "bg-white text-charcoal-600 border border-cream-300 hover:bg-cream-100"
            }`}
          >
            All Collections
          </button>
          <button
            onClick={() => setPaymentFilter("CASH")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
              paymentFilter === "CASH"
                ? "bg-amberGold-600 text-white"
                : "bg-white text-charcoal-600 border border-cream-300 hover:bg-cream-100"
            }`}
          >
            <DollarSign className="w-3 h-3" /> Cash Orders
          </button>
          <button
            onClick={() => setPaymentFilter("ONLINE")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
              paymentFilter === "ONLINE"
                ? "bg-forest-600 text-white"
                : "bg-white text-charcoal-600 border border-cream-300 hover:bg-cream-100"
            }`}
          >
            <QrCode className="w-3 h-3" /> Online / UPI
          </button>
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-4">
        {filteredRuns.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-cream-300 text-center shadow-subtle space-y-2">
            <Bike className="w-10 h-10 text-charcoal-300 mx-auto" />
            <p className="text-xs font-semibold text-charcoal-600">
              {tab === "ACTIVE"
                ? "No delivery assignments matching this filter."
                : "No completed runs recorded for this filter."}
            </p>
            <p className="text-[11px] text-charcoal-400">
              {tab === "ACTIVE"
                ? "Stay on duty to receive incoming orders assigned by the hub dispatcher."
                : "Completed delivery records will appear here after customer handover."}
            </p>
          </div>
        ) : (
          filteredRuns.map((assignment) => {
            const ord = assignment.order;
            if (!ord) return null;

            let parsedAddr: any = null;
            try {
              parsedAddr =
                typeof ord.deliveryAddressSnapshot === "string"
                  ? JSON.parse(ord.deliveryAddressSnapshot)
                  : ord.deliveryAddressSnapshot;
            } catch {
              parsedAddr = { addressLine: ord.deliveryAddressSnapshot };
            }

            const isCod =
              ord.payment?.method === "COD" || (ord.codFeeMinor || 0) > 0 || ord.paymentMethod === "COD";
            const collectionMethod = ord.deliveryCollection?.collectionMethod;
            const isOnlineDoorstep = collectionMethod === "ONLINE_DOORSTEP";
            const isCashCollected = collectionMethod === "CASH";
            const isPaidOnline = ord.payment?.status === "COMPLETED" || isOnlineDoorstep;

            const displayAddress =
              parsedAddr?.addressLine ||
              parsedAddr?.line1 ||
              (typeof parsedAddr === "string" ? parsedAddr : "Delivery Address");
            const displayLocality = parsedAddr?.locality || parsedAddr?.line2 || "";
            const displayLandmark = parsedAddr?.landmark ? ` (Near: ${parsedAddr.landmark})` : "";
            const totalWeightGrams = (ord.items || []).reduce(
              (sum, item) => sum + (item.weightGrams || 0) * (item.quantity || 1),
              0
            );
            const totalWeightKg = totalWeightGrams / 1000;

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-cream-300 shadow-subtle overflow-hidden"
              >
                {/* Header status bar */}
                <div className="p-4 bg-cream-50 border-b border-cream-200 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-sm text-charcoal-800">
                      Order #{ord.orderNumber}
                    </span>
                    <span className="text-[10px] text-charcoal-400 block font-mono">
                      Placed:{" "}
                      {new Date(ord.placedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      assignment.status === "STARTED"
                        ? "bg-amberGold-100 text-amberGold-800 border border-amberGold-300 animate-pulse"
                        : assignment.status === "DELIVERED"
                        ? "bg-forest-100 text-forest-800 border border-forest-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}
                  >
                    {assignment.status === "STARTED"
                      ? "OUT FOR DELIVERY"
                      : assignment.status === "ASSIGNED"
                      ? "READY FOR PICKUP"
                      : "DELIVERED"}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {/* Customer info */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-charcoal-800 block">
                        {ord.user?.name || "Customer"}
                      </span>
                      <p className="text-[11px] text-charcoal-500 line-clamp-2 mt-0.5">
                        {displayAddress}
                        {displayLocality ? `, ${displayLocality}` : ""}
                        {displayLandmark}
                      </p>
                    </div>

                    {ord.user?.mobile && (
                      <a
                        href={`tel:${ord.user.mobile}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-700 text-xs font-bold rounded-xl transition"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>

                  {/* Payment Callout with Separate Original & Collection Accounting */}
                  <div
                    className={`p-3 rounded-xl flex items-center justify-between text-xs ${
                      isOnlineDoorstep
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : isCashCollected
                        ? "bg-amberGold-50 border border-amberGold-200 text-charcoal-800"
                        : isPaidOnline
                        ? "bg-forest-50 border border-forest-200 text-forest-800"
                        : "bg-crimson-50 border border-crimson-200 text-crimson-800"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold flex items-center gap-1.5">
                        {isOnlineDoorstep ? (
                          <QrCode className="w-4 h-4 text-blue-600" />
                        ) : isPaidOnline ? (
                          <CreditCard className="w-4 h-4 text-forest-600" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-amberGold-600" />
                        )}
                        {isOnlineDoorstep
                          ? "DOORSTEP ONLINE COLLECTION"
                          : isCashCollected
                          ? "CASH COLLECTED AT DOORSTEP"
                          : isPaidOnline
                          ? "ONLINE PREPAID"
                          : "COLLECT CASH ON DELIVERY"}
                      </span>
                      <span className="text-[10px] block opacity-75 font-mono">
                        Original: {isCod ? "COD" : (ord.payment?.method || "ONLINE")} {isOnlineDoorstep ? "• Converted to Doorstep QR" : ""}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm block">
                        {isPaidOnline
                          ? `PAID ${formatCurrency(ord.totalMinor)}`
                          : formatCurrency(ord.totalMinor)}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {isPaidOnline ? "Settled" : "Due from Customer"}
                      </span>
                    </div>
                  </div>

                  {/* Items summary & action */}
                  <div className="pt-2 border-t border-cream-200 flex items-center justify-between text-xs text-charcoal-500">
                    <span className="flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-charcoal-400" />
                      {(ord.items || []).length} item(s)
                      {totalWeightKg > 0 ? ` • ${totalWeightKg.toFixed(2)} kg` : ""}
                    </span>

                    <Link
                      href={`/delivery/orders/${assignment.id}`}
                      className="flex items-center gap-1 font-semibold text-crimson-600 hover:text-crimson-700 hover:underline"
                    >
                      View Details & Action <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
