"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  Tag,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface OfferItem {
  id: string;
  title: string;
  description: string;
  type: "OFFER" | "ANNOUNCEMENT";
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  couponCode?: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  priority: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminContentCMSPage() {
  const [items, setItems] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "OFFER",
    imageUrl: "",
    ctaLabel: "",
    ctaUrl: "",
    couponCode: "",
    status: "DRAFT",
    priority: 0,
  });

  const loadContent = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const url = filterStatus === "ALL" ? "/api/admin/content" : `/api/admin/content?status=${filterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else {
        setActionError("Failed to fetch promotional content items");
      }
    } catch (e: any) {
      setActionError(e.message || "Network error loading content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [filterStatus]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      type: "OFFER",
      imageUrl: "",
      ctaLabel: "",
      ctaUrl: "",
      couponCode: "",
      status: "DRAFT",
      priority: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: OfferItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      type: item.type,
      imageUrl: item.imageUrl || "",
      ctaLabel: item.ctaLabel || "",
      ctaUrl: item.ctaUrl || "",
      couponCode: item.couponCode || "",
      status: item.status,
      priority: item.priority,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      setActionError("Title and description are required.");
      return;
    }

    if (formData.ctaUrl && !formData.ctaUrl.startsWith("/")) {
      setActionError("CTA URL must be a relative link starting with '/' (e.g. /menu?cat=fresh-chicken)");
      return;
    }

    try {
      const method = editingItem ? "PATCH" : "POST";
      const endpoint = editingItem ? `/api/admin/content/${editingItem.id}` : "/api/admin/content";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save content card");
      }

      setActionSuccess(editingItem ? "Promotional card updated successfully" : "Promotional card created successfully");
      setIsModalOpen(false);
      loadContent();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleToggleStatus = async (item: OfferItem) => {
    const nextStatus = item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        loadContent();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional card?")) return;
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadContent();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Storefront Content CMS</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Promotional Carousel &amp; Offers
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Manage real-time homepage promotional cards. The top 5 highest-priority PUBLISHED cards rotate automatically every 1 second for customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadContent}
            className="p-2.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Offer / Card</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterStatus === st
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-stone-400">Loading promotional content...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Sparkles className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="font-serif text-base font-bold text-stone-700">No Content Cards Found</h3>
          <p className="text-xs text-stone-400">
            Create promotional cards to highlight fresh chicken discounts, egg packs, or express delivery announcements.
          </p>
          <button
            onClick={handleOpenCreate}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Create first card &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isPub = item.status === "PUBLISHED";
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Status & Priority header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isPub
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : item.status === "DRAFT"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-stone-100 text-stone-600 border border-stone-300"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Priority: {item.priority}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      {item.type}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata Chips: Coupon & CTA */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    {item.couponCode && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-mono font-bold border border-rose-200">
                        <Tag className="w-3 h-3" />
                        <span>{item.couponCode}</span>
                      </span>
                    )}
                    {item.ctaLabel && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-100 text-stone-700 font-semibold">
                        <span>{item.ctaLabel}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span className="text-stone-400 font-mono text-[9px]">{item.ctaUrl}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-stone-100 mt-3 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                      isPub
                        ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    {isPub ? "Unpublish to Draft" : "Publish to Carousel"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="font-serif text-lg font-bold text-stone-900">
                {editingItem ? "Edit Promotional Card" : "New Promotional Card"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. 100% Halal Fresh Farm Chicken"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Card Description *
                </label>
                <textarea
                  required
                  rows={2}
                  maxLength={400}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Express 20-minute delivery in Mulbagal. Daily fresh cuts prepared hygienic to order."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Card Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="OFFER">Offer</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  >
                    <option value="PUBLISHED">Published (Active)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Coupon Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) => setFormData({ ...formData, couponCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. FRESH100"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Priority (Higher = 1st)
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.ctaLabel}
                    onChange={(e) => setFormData({ ...formData, ctaLabel: e.target.value })}
                    placeholder="e.g. Order Chicken"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Target URL (Relative /)
                  </label>
                  <input
                    type="text"
                    value={formData.ctaUrl}
                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                    placeholder="/menu?cat=fresh-chicken"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="pt-2">
                <span className="block font-bold text-stone-600 mb-1 uppercase tracking-wider text-[10px]">
                  Live Homepage Carousel Preview:
                </span>
                <div className="rounded-2xl bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 text-white p-3.5 border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase">
                      {formData.type}
                    </span>
                    {formData.couponCode && (
                      <span className="font-mono bg-white text-stone-900 px-2 py-0.5 rounded font-bold">
                        {formData.couponCode}
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif text-sm font-bold">{formData.title || "Headline preview..."}</h4>
                  <p className="text-[11px] text-stone-300 line-clamp-2">{formData.description || "Description preview..."}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
