"use client";

import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle2, Store, MapPin, DollarSign, Truck, CreditCard } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    shop_name: "homemart4u",
    shop_phone: "+91 90355 26638",
    shop_address: "Srinivaspur Road, Mulbagal 563131",
    shop_email: "support.homemart4u@gmail.com",
    shop_latitude: "13.1645",
    shop_longitude: "78.3952",
    store_open_status: "OPEN",
    free_delivery_radius_meters: "3000",
    delivery_rate_per_100m_paise: "150",
    cod_surcharge_paise: "700",
    minimum_order_meat_grams: "0",
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
        (data.settings || []).forEach((s: { key: string; value: string }) => {
          map[s.key] = s.value;
        });
        if (map["SHOP_NAME"] && !map["shop_name"]) {
          map["shop_name"] = map["SHOP_NAME"];
        }
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, val: string) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update system settings");
      }

      setFeedback({ type: "success", msg: "Operational settings saved successfully!" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal-700">Shop & Platform Settings</h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Configure store location coordinates, delivery fee logic, COD surcharges, and order qualification rules.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 px-3 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-700 text-xs font-semibold rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Reload
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-forest-50 border border-forest-200 text-forest-700"
              : "bg-crimson-50 border border-crimson-200 text-crimson-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {feedback.msg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store & Coordinates */}
        <div className="bg-white p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cream-200">
            <Store className="w-5 h-5 text-crimson-600" />
            <h2 className="font-semibold text-charcoal-800 text-sm">Physical Hub & Origin Coordinates</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Store Business Name
              </label>
              <input
                type="text"
                value={settings.shop_name || ""}
                onChange={(e) => handleChange("shop_name", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Store Helpline / WhatsApp
              </label>
              <input
                type="text"
                value={settings.shop_phone || ""}
                onChange={(e) => handleChange("shop_phone", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Store Physical Address
            </label>
            <input
              type="text"
              value={settings.shop_address || ""}
              onChange={(e) => handleChange("shop_address", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Hub Latitude
              </label>
              <input
                type="text"
                value={settings.shop_latitude || ""}
                onChange={(e) => handleChange("shop_latitude", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Hub Longitude
              </label>
              <input
                type="text"
                value={settings.shop_longitude || ""}
                onChange={(e) => handleChange("shop_longitude", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Store Operating Status
              </label>
              <select
                value={settings.store_open_status || "OPEN"}
                onChange={(e) => handleChange("store_open_status", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-semibold text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              >
                <option value="OPEN">Store Active (Accepting Orders)</option>
                <option value="CLOSED">Store Closed (Maintenance/Night)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery & Business Rules */}
        <div className="bg-white p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cream-200">
            <Truck className="w-5 h-5 text-amberGold-600" />
            <h2 className="font-semibold text-charcoal-800 text-sm">Delivery Calculation & Surcharge Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Free Delivery Radius (Meters)
              </label>
              <input
                type="number"
                value={settings.free_delivery_radius_meters || "3000"}
                onChange={(e) => handleChange("free_delivery_radius_meters", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">Default: 3000m (3 km)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Rate per 100m Beyond (Paise)
              </label>
              <input
                type="number"
                value={settings.delivery_rate_per_100m_paise || "150"}
                onChange={(e) => handleChange("delivery_rate_per_100m_paise", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">150 paise = ₹1.50 per 100m</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Cash on Delivery Fee (Paise)
              </label>
              <input
                type="number"
                value={settings.cod_surcharge_paise || "700"}
                onChange={(e) => handleChange("cod_surcharge_paise", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">700 paise = ₹7.00 surcharge</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Min Qualifying Meat (Grams)
              </label>
              <input
                type="number"
                value={settings.minimum_order_meat_grams ?? "0"}
                onChange={(e) => handleChange("minimum_order_meat_grams", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">0 = No minimum order limit (any quantity allowed)</span>
            </div>
          </div>
        </div>

        {/* Section 3: UPI Payment Gateway & VPA Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-cream-300 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-cream-200">
            <CreditCard className="w-5 h-5 text-forest-600" />
            <h2 className="font-semibold text-charcoal-800 text-sm">UPI Payment Gateway & Payee VPA</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Active Merchant UPI ID (VPA)
              </label>
              <input
                type="text"
                placeholder="e.g. yourstore@okhdfcbank or 9876543210@paytm"
                value={settings.UPI_VPA || ""}
                onChange={(e) => handleChange("UPI_VPA", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Customer payments and dynamic QR codes will directly route to this UPI ID.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                UPI Payee / Merchant Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. homemart4u"
                value={settings.UPI_MERCHANT_NAME || ""}
                onChange={(e) => handleChange("UPI_MERCHANT_NAME", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
              <span className="text-[10px] text-charcoal-400 mt-1 block">
                Shown to customers inside Google Pay, PhonePe, Paytm before authorizing payment.
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-semibold shadow-subtle transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Operational Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
