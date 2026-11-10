"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Image as ImageIcon,
  Store,
  Truck,
  CreditCard,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Power,
  DollarSign,
  FileText,
  Compass,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    // Business Information
    shop_name: "homemart4u",
    shop_phone: "+91 90355 26638",
    support_phone: "+91 90355 26638",
    shop_email: "support.homemart4u@gmail.com",
    shop_address: "Srinivaspur Road, Mulbagal 563131",
    store_opening_hours: "07:00 AM",
    store_closing_hours: "09:00 PM",
    shop_logo_url: "/logo.png",
    shop_latitude: "13.1645",
    shop_longitude: "78.3952",

    // Store Operations
    store_status: "OPEN",
    store_open_status: "OPEN",
    store_closed_message: "We are currently closed for orders. Please visit us during our operating hours.",
    store_reopening_info: "Opening tomorrow at 07:00 AM",
    order_acceptance_enabled: "true",

    // Delivery Settings
    delivery_available: "true",
    delivery_radius_km: "10",
    free_delivery_radius_meters: "3000",
    base_delivery_fee_paise: "3000",
    free_delivery_threshold_paise: "50000",
    delivery_rate_per_100m_paise: "150",
    min_order_amount_paise: "0",
    minimum_order_meat_grams: "0",

    // Checkout & Payment Settings
    cod_available: "true",
    cod_surcharge_paise: "700",
    order_instructions: "Orders are prepared fresh upon confirmation. Cash on Delivery is strictly collected at your doorstep.",
    UPI_VPA: "",
    UPI_MERCHANT_NAME: "homemart4u",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, string> = {};
        const ignoredKeys = new Set(["DELIVERY_ROUND_ROBIN_INDEX", "delivery_round_robin_index"]);
        (data.settings || []).forEach((s: { key: string; value: string }) => {
          if (!ignoredKeys.has(s.key)) {
            map[s.key] = s.value;
          }
        });

        // Normalize aliases
        if (map["SHOP_NAME"] && !map["shop_name"]) {
          map["shop_name"] = map["SHOP_NAME"];
        }
        if (map["STORE_OPEN"] && !map["store_status"]) {
          map["store_status"] = map["STORE_OPEN"] === "true" ? "OPEN" : "CLOSED";
        }
        if (map["ORDER_ACCEPTANCE_ENABLED"] && !map["order_acceptance_enabled"]) {
          map["order_acceptance_enabled"] = map["ORDER_ACCEPTANCE_ENABLED"];
        }

        setSettings((prev) => ({ ...prev, ...map }));
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || "Failed to load settings" });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", msg: "Network error loading system settings" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === "store_status") {
        updated.store_open_status = val;
      }
      return updated;
    });
  };

  const handleToggle = (key: string) => {
    setSettings((prev) => {
      const current = prev[key];
      let nextVal = "true";
      if (key === "store_status" || key === "store_open_status") {
        nextVal = current === "OPEN" ? "CLOSED" : "OPEN";
        return {
          ...prev,
          store_status: nextVal,
          store_open_status: nextVal,
        };
      } else {
        nextVal = current === "true" ? "false" : "true";
        return {
          ...prev,
          [key]: nextVal,
        };
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Frontend validations
    const shopName = settings.shop_name?.trim();
    if (!shopName || shopName.length < 2 || shopName.length > 100) {
      setFeedback({
        type: "error",
        msg: "Shop Name must be between 2 and 100 characters.",
      });
      setSaving(false);
      return;
    }

    try {
      const ignoredKeys = ["DELIVERY_ROUND_ROBIN_INDEX", "delivery_round_robin_index"];
      ignoredKeys.forEach((key) => delete (settings as any)[key]);

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update system settings");
      }

      setFeedback({ type: "success", msg: "All business & platform settings saved successfully!" });
      setTimeout(() => setFeedback(null), 5000);
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cream-200 text-charcoal-700 text-xs font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5 text-crimson-600" />
            <span>Storefront Administration</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-charcoal-800">
            Store &amp; Business Management
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage your store information, operating hours, delivery parameters, and checkout rules without editing code.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Reload Settings</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-3 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : "bg-rose-50 border border-rose-300 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          <span className="flex-1">{feedback.msg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================= */}
        {/* SECTION 1: BUSINESS INFORMATION */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cream-200">
            <div className="p-2 rounded-xl bg-crimson-50 text-crimson-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-charcoal-800 text-base">
                1. Business &amp; Contact Information
              </h2>
              <p className="text-[11px] text-charcoal-400">
                Public store details displayed on customer storefront headers, receipts, and footers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shop Name */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Shop Name <span className="text-crimson-600">*</span>
              </label>
              <input
                type="text"
                required
                value={settings.shop_name || ""}
                onChange={(e) => handleChange("shop_name", e.target.value)}
                placeholder="e.g. homemart4u"
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Primary business brand name (2-100 characters).
              </span>
            </div>

            {/* Primary Phone */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Primary Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.shop_phone || ""}
                  onChange={(e) => handleChange("shop_phone", e.target.value)}
                  placeholder="e.g. +91 90355 26638"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Direct phone line for store operations.
              </span>
            </div>

            {/* Support Contact */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Support Helpline / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.support_phone || ""}
                  onChange={(e) => handleChange("support_phone", e.target.value)}
                  placeholder="e.g. +91 90355 26638"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Customer support number shown on help banners.
              </span>
            </div>

            {/* Support Email */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Support Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={settings.shop_email || ""}
                  onChange={(e) => handleChange("shop_email", e.target.value)}
                  placeholder="support.homemart4u@gmail.com"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Official email address for invoices and inquiries.
              </span>
            </div>

            {/* Physical Address */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Physical Store Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  value={settings.shop_address || ""}
                  onChange={(e) => handleChange("shop_address", e.target.value)}
                  placeholder="Srinivaspur Road, Mulbagal 563131"
                  className="w-full min-h-[64px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition resize-none"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Full physical store address for dispatch origin &amp; invoice printing.
              </span>
            </div>

            {/* Opening & Closing Hours */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Daily Opening Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.store_opening_hours || ""}
                  onChange={(e) => handleChange("store_opening_hours", e.target.value)}
                  placeholder="07:00 AM"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Store daily opening time (e.g. 07:00 AM).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Daily Closing Hours
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.store_closing_hours || ""}
                  onChange={(e) => handleChange("store_closing_hours", e.target.value)}
                  placeholder="09:00 PM"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Store daily closing time (e.g. 09:00 PM).
              </span>
            </div>

            {/* Shop Logo URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Shop Logo URL
              </label>
              <div className="relative">
                <ImageIcon className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.shop_logo_url || ""}
                  onChange={(e) => handleChange("shop_logo_url", e.target.value)}
                  placeholder="/logo.png or https://..."
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition font-mono"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Path or URL to the store brand logo image.
              </span>
            </div>

            {/* Origin Coordinates */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Hub Origin Latitude
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.shop_latitude || ""}
                  onChange={(e) => handleChange("shop_latitude", e.target.value)}
                  placeholder="13.1645"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                GPS latitude for delivery distance calculation.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Hub Origin Longitude
              </label>
              <div className="relative">
                <Compass className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={settings.shop_longitude || ""}
                  onChange={(e) => handleChange("shop_longitude", e.target.value)}
                  placeholder="78.3952"
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                GPS longitude for delivery distance calculation.
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: STORE OPERATIONS */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cream-200">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-charcoal-800 text-base">
                2. Store Operating Status &amp; Availability
              </h2>
              <p className="text-[11px] text-charcoal-400">
                Control customer ordering availability and banner notices across the application.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Store Status Toggle */}
            <div className="p-4 rounded-xl border border-cream-200 bg-cream-50 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-charcoal-800 block">
                  Store Operating Status
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  {(settings.store_status || "OPEN") === "OPEN"
                    ? "Store is OPEN. Customers can add to cart and place orders."
                    : "Store is CLOSED. Catalogue is visible but checkout is paused."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("store_status")}
                className={`min-h-[44px] min-w-[100px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  (settings.store_status || "OPEN") === "OPEN"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{(settings.store_status || "OPEN") === "OPEN" ? "OPEN" : "CLOSED"}</span>
              </button>
            </div>

            {/* Order Acceptance Switch */}
            <div className="p-4 rounded-xl border border-cream-200 bg-cream-50 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-charcoal-800 block">
                  Order Acceptance Status
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  {settings.order_acceptance_enabled === "true"
                    ? "Accepting new order dispatches."
                    : "New order placement temporarily disabled."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("order_acceptance_enabled")}
                className={`min-h-[44px] min-w-[100px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  settings.order_acceptance_enabled === "true"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-stone-500 hover:bg-stone-600 text-white"
                }`}
              >
                <span>{settings.order_acceptance_enabled === "true" ? "ACTIVE" : "PAUSED"}</span>
              </button>
            </div>

            {/* Temporary Closure Message */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Temporary Closure Message (Shown when Closed)
              </label>
              <textarea
                rows={2}
                value={settings.store_closed_message || ""}
                onChange={(e) => handleChange("store_closed_message", e.target.value)}
                placeholder="We are currently closed for orders..."
                className="w-full min-h-[64px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition resize-none"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Displayed in the banner when the store is marked as CLOSED.
              </span>
            </div>

            {/* Store Reopening Info */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Store Reopening Info
              </label>
              <input
                type="text"
                value={settings.store_reopening_info || ""}
                onChange={(e) => handleChange("store_reopening_info", e.target.value)}
                placeholder="Opening tomorrow at 07:00 AM"
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Help text informing customers when order placement will resume.
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 3: DELIVERY SETTINGS */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cream-200">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-charcoal-800 text-base">
                3. Delivery Parameters &amp; Fee Logic
              </h2>
              <p className="text-[11px] text-charcoal-400">
                Configure delivery radius, base delivery fees, distance surcharges, and order minimums.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Delivery Availability Toggle */}
            <div className="p-4 rounded-xl border border-cream-200 bg-cream-50 flex items-center justify-between gap-4 sm:col-span-2 lg:col-span-3">
              <div>
                <span className="text-xs font-bold text-charcoal-800 block">
                  Delivery Service Availability
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  {settings.delivery_available === "true"
                    ? "Home delivery is available to eligible customer addresses."
                    : "Delivery service is paused. Customers will be alerted."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("delivery_available")}
                className={`min-h-[44px] min-w-[100px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  settings.delivery_available === "true"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-stone-500 hover:bg-stone-600 text-white"
                }`}
              >
                <span>{settings.delivery_available === "true" ? "ENABLED" : "DISABLED"}</span>
              </button>
            </div>

            {/* Delivery Radius (km) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Maximum Delivery Radius (km)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.delivery_radius_km || "10"}
                onChange={(e) => handleChange("delivery_radius_km", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Deliveries beyond this radius are restricted (default: 10 km).
              </span>
            </div>

            {/* Free Delivery Radius (meters) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Free Delivery Radius (Meters)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.free_delivery_radius_meters || "3000"}
                onChange={(e) => handleChange("free_delivery_radius_meters", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                3000m = 3 km base free zone from shop origin.
              </span>
            </div>

            {/* Base Delivery Fee (paise) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Base Delivery Fee (Paise)
              </label>
              <input
                type="number"
                min="0"
                value={settings.base_delivery_fee_paise || "3000"}
                onChange={(e) => handleChange("base_delivery_fee_paise", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                3000 paise = ₹30.00 standard delivery charge.
              </span>
            </div>

            {/* Free Delivery Order Threshold (paise) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Free Delivery Threshold (Paise)
              </label>
              <input
                type="number"
                min="0"
                value={settings.free_delivery_threshold_paise || "50000"}
                onChange={(e) => handleChange("free_delivery_threshold_paise", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                50000 paise = Orders over ₹500 get free delivery.
              </span>
            </div>

            {/* Rate per 100m Beyond Radius (paise) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Rate per 100m Beyond Radius (Paise)
              </label>
              <input
                type="number"
                min="0"
                value={settings.delivery_rate_per_100m_paise || "150"}
                onChange={(e) => handleChange("delivery_rate_per_100m_paise", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                150 paise = ₹1.50 per 100m past free delivery radius.
              </span>
            </div>

            {/* Minimum Order Amount (paise) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Minimum Order Amount (Paise)
              </label>
              <input
                type="number"
                min="0"
                value={settings.min_order_amount_paise || "0"}
                onChange={(e) => handleChange("min_order_amount_paise", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                0 = No minimum order value restriction.
              </span>
            </div>

            {/* Minimum Meat (grams) */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Min Qualifying Meat Weight (Grams)
              </label>
              <input
                type="number"
                min="0"
                value={settings.minimum_order_meat_grams ?? "0"}
                onChange={(e) => handleChange("minimum_order_meat_grams", e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                0 = Any meat order portion accepted without limit.
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 4: CHECKOUT & PAYMENT SETTINGS */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-cream-200">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-charcoal-800 text-base">
                4. Checkout Policy &amp; Doorstep Payment Settings
              </h2>
              <p className="text-[11px] text-charcoal-400">
                Configure Cash on Delivery options, door-step surcharge fees, and customer instructions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* COD Availability Toggle */}
            <div className="p-4 rounded-xl border border-cream-200 bg-cream-50 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-charcoal-800 block">
                  Cash on Delivery (COD) Checkout
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  {settings.cod_available === "true"
                    ? "COD is enabled. Customers pay cash or UPI at delivery doorstep."
                    : "COD checkout is disabled."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("cod_available")}
                className={`min-h-[44px] min-w-[100px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  settings.cod_available === "true"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-stone-500 hover:bg-stone-600 text-white"
                }`}
              >
                <span>{settings.cod_available === "true" ? "ACTIVE" : "PAUSED"}</span>
              </button>
            </div>

            {/* COD Surcharge Fee */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                COD Convenience Surcharge Fee (Paise)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={settings.cod_surcharge_paise || "700"}
                  onChange={(e) => handleChange("cod_surcharge_paise", e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                700 paise = ₹7.00 surcharge for handling cash at doorstep.
              </span>
            </div>

            {/* Order Instructions / Checkout Policy */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Customer Order Instructions / Checkout Policy Notice
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  value={settings.order_instructions || ""}
                  onChange={(e) => handleChange("order_instructions", e.target.value)}
                  placeholder="Orders are prepared fresh upon confirmation..."
                  className="w-full min-h-[72px] pl-10 pr-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition resize-none"
                />
              </div>
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Printed on invoice and shown above the Place Order button on checkout.
              </span>
            </div>

            {/* Active Merchant UPI ID */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Active Merchant UPI ID (Payee VPA)
              </label>
              <input
                type="text"
                value={settings.UPI_VPA || ""}
                onChange={(e) => handleChange("UPI_VPA", e.target.value)}
                placeholder="e.g. homemart4u@okhdfcbank"
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Used to generate dynamic QR codes for doorstep payment.
              </span>
            </div>

            {/* Merchant Display Name */}
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                UPI Payee / Merchant Display Name
              </label>
              <input
                type="text"
                value={settings.UPI_MERCHANT_NAME || ""}
                onChange={(e) => handleChange("UPI_MERCHANT_NAME", e.target.value)}
                placeholder="e.g. homemart4u"
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 focus:bg-white transition"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Displayed in Google Pay / PhonePe / Paytm when scanning QR.
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUBMIT BUTTON BAR */}
        {/* ========================================================= */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-cream-300 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-charcoal-500 font-medium text-center sm:text-left">
            Changes are saved directly to PostgreSQL and take effect immediately.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-subtle transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save All Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
