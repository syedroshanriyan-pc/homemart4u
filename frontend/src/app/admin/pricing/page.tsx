"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DollarSign, Save, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, Search, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/delivery";
import { useRealTime } from "@/lib/useRealTime";

interface Variant {
  id: string;
  name: string;
  priceMinor: number;
  weightGrams?: number;
  quantityValue?: number;
  quantityUnit?: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: { name: string; slug?: string; department?: string };
  variants: Variant[];
  updatedAt: string;
}

export default function AdminPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>({}); // variantId -> rupees
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: "success" | "error"; msg: string } | null>(null);

  // Department filter: "ALL", "MEAT", "GROCERY"
  const [selectedDept, setSelectedDept] = useState<"ALL" | "MEAT" | "GROCERY">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        // Initialize prices in rupees
        const initialPrices: Record<string, number> = {};
        (data.products || []).forEach((p: Product) => {
          p.variants.forEach((v) => {
            initialPrices[v.id] = Math.round(v.priceMinor / 100);
          });
        });
        setPrices(initialPrices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handlePriceChange = (variantId: string, val: number) => {
    setPrices((prev) => ({ ...prev, [variantId]: Math.max(0, val) }));
  };

  const adjustPrice = (variantId: string, delta: number) => {
    setPrices((prev) => ({
      ...prev,
      [variantId]: Math.max(0, (prev[variantId] || 0) + delta),
    }));
  };

  const savePrice = async (productId: string, variantId: string) => {
    setSavingId(variantId);
    setFeedback(null);
    try {
      const rupees = prices[variantId];
      const res = await fetch(`/api/admin/products/${productId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          newPriceRupees: rupees,
          newPriceMinor: rupees * 100,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update price");
      }

      setFeedback({ id: variantId, type: "success", msg: "Price updated" });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ id: variantId, type: "error", msg: err.message });
    } finally {
      setSavingId(null);
    }
  };

  // Filter products by department and search
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const dept = prod.category?.department || "MEAT";
      if (selectedDept !== "ALL" && dept !== selectedDept) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesCategory = prod.category?.name.toLowerCase().includes(q);
        return matchesName || matchesCategory;
      }
      return true;
    });
  }, [products, selectedDept, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">
            Daily Pricing Board
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Update fresh market chicken cuts and grocery items per pack/variant. Changes reflect instantly on customer store.
          </p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Catalog</span>
        </button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
        <TrendingUp className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700">
          <p className="font-semibold text-stone-900">Live Daily Price Index Management</p>
          <p className="mt-0.5">
            Use the +/- buttons to adjust morning daily fluctuations across chicken cuts, milk, eggs, rice, oils, and vegetables. All price revisions are saved with full audit logging.
          </p>
        </div>
      </div>

      {/* Department & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-subtle">
        {/* Department Switcher Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedDept("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedDept === "ALL"
                ? "bg-stone-800 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setSelectedDept("MEAT")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedDept === "MEAT"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>🍗 Fresh Meat</span>
          </button>
          <button
            onClick={() => setSelectedDept("GROCERY")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedDept === "GROCERY"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <span>🛒 Daily Groceries</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search cuts, atta, oil, milk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Products Pricing Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-subtle">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            Loading catalog prices...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            No products found matching the selected department.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Department / Category</th>
                  <th className="px-6 py-4">Pack / Variant</th>
                  <th className="px-6 py-4">Current Price</th>
                  <th className="px-6 py-4">Quick Adjust</th>
                  <th className="px-6 py-4">New Price (₹)</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.flatMap((prod) => {
                  const isGrocery = prod.category?.department === "GROCERY";

                  return prod.variants.map((variant) => {
                    const currentRupees = Math.round(variant.priceMinor / 100);
                    const editedRupees = prices[variant.id] ?? currentRupees;
                    const isModified = editedRupees !== currentRupees;
                    const itemFeedback = feedback?.id === variant.id ? feedback : null;

                    return (
                      <tr key={variant.id} className="hover:bg-stone-50/70 transition">
                        {/* Name */}
                        <td className="px-6 py-4 font-semibold text-stone-800">
                          {prod.name}
                        </td>

                        {/* Department & Category */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isGrocery ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}>
                            {isGrocery ? "🛒 Grocery" : "🍗 Meat"} &bull; {prod.category?.name || "General"}
                          </span>
                        </td>

                        {/* Variant */}
                        <td className="px-6 py-4 text-stone-600 font-mono">
                          {variant.name} {variant.quantityValue ? `(${variant.quantityValue}${variant.quantityUnit || "g"})` : ""}
                        </td>

                        {/* Current Price */}
                        <td className="px-6 py-4 font-mono font-semibold text-stone-700">
                          {formatCurrency(variant.priceMinor)}
                        </td>

                        {/* Quick Adjust Buttons */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustPrice(variant.id, -10)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded-lg text-stone-700 transition"
                              title="-₹10"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustPrice(variant.id, -5)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded-lg text-stone-700 transition"
                              title="-₹5"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustPrice(variant.id, 5)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded-lg text-stone-700 transition"
                              title="+₹5"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustPrice(variant.id, 10)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-[10px] font-bold rounded-lg text-stone-700 transition"
                              title="+₹10"
                            >
                              +10
                            </button>
                          </div>
                        </td>

                        {/* New Price Input */}
                        <td className="px-6 py-4">
                          <div className="relative w-28">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={editedRupees}
                              onChange={(e) =>
                                handlePriceChange(variant.id, parseInt(e.target.value) || 0)
                              }
                              className={`w-full pl-6 pr-3 py-1.5 text-xs font-mono font-bold rounded-xl border focus:outline-none transition ${
                                isModified
                                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-200"
                                  : "border-stone-200 bg-stone-50 text-stone-800 focus:border-stone-400"
                              }`}
                            />
                          </div>
                        </td>

                        {/* Save Action */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {itemFeedback && (
                              <span
                                className={`text-[10px] font-medium flex items-center gap-1 ${
                                  itemFeedback.type === "success"
                                    ? "text-emerald-600"
                                    : "text-rose-600"
                                }`}
                              >
                                {itemFeedback.type === "success" ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {itemFeedback.msg}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => savePrice(prod.id, variant.id)}
                              disabled={savingId === variant.id || !isModified}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                                isModified
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                  : "bg-stone-100 text-stone-400 cursor-not-allowed"
                              }`}
                            >
                              {savingId === variant.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              <span>Save</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
