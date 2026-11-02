"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  FolderTree,
  CornerDownRight,
  Search,
  Filter,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SubCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  department: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isComingSoon: boolean;
  _count?: { products: number };
}

interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  department: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  isComingSoon: boolean;
  children?: SubCategory[];
  _count?: { products: number; children: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allFlatCategories, setAllFlatCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<"ALL" | "MEAT" | "GROCERY">("ALL");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Delete confirmation
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    slug: "",
    parentId: "",
    department: "MEAT",
    description: "",
    imageUrl: "",
    displayOrder: 0,
    isActive: true,
    isComingSoon: false,
  });

  const showStatus = (msg: string, type: "success" | "error" = "success") => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [hierarchicalRes, flatRes] = await Promise.all([
        fetch("/api/admin/categories"),
        fetch("/api/admin/categories?flat=true"),
      ]);

      if (hierarchicalRes.ok) {
        const data = await hierarchicalRes.json();
        setCategories(data.categories || []);
        // Expand all parents by default
        const initialExpanded: Record<string, boolean> = {};
        (data.categories || []).forEach((c: Category) => {
          initialExpanded[c.id] = true;
        });
        setExpandedParents(initialExpanded);
      }

      if (flatRes.ok) {
        const flatData = await flatRes.json();
        setAllFlatCategories(flatData.categories || []);
      }
    } catch (err: any) {
      console.error(err);
      showStatus("Failed to load category catalogue", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = (parentPresetId?: string) => {
    setIsEditing(false);
    setEditingId(null);
    const parentCat = parentPresetId ? allFlatCategories.find((c) => c.id === parentPresetId) : null;
    setForm({
      name: "",
      slug: "",
      parentId: parentPresetId || "",
      department: parentCat ? parentCat.department : "MEAT",
      description: "",
      imageUrl: "",
      displayOrder: 0,
      isActive: true,
      isComingSoon: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category | SubCategory) => {
    setIsEditing(true);
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId || "",
      department: cat.department || "MEAT",
      description: cat.description || "",
      imageUrl: cat.imageUrl || "",
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
      isComingSoon: Boolean(cat.isComingSoon),
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => {
      const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      return {
        ...prev,
        name,
        slug: !isEditing ? generatedSlug : prev.slug,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/admin/categories";
      const method = isEditing ? "PATCH" : "POST";
      const payload: any = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        department: form.department,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        displayOrder: form.displayOrder,
        parentId: form.parentId ? form.parentId : null,
        isActive: form.isActive,
        isComingSoon: form.isComingSoon,
      };

      if (isEditing) {
        payload.id = editingId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save category");
      }

      setIsModalOpen(false);
      showStatus(isEditing ? `Updated "${data.category.name}" successfully!` : `Created "${data.category.name}" successfully!`);
      await fetchCategories();
    } catch (err: any) {
      showStatus(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComingSoon = async (cat: Category | SubCategory) => {
    try {
      const nextVal = !cat.isComingSoon;
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isComingSoon: nextVal }),
      });
      if (res.ok) {
        showStatus(`Updated "${cat.name}" status`);
        fetchCategories();
      } else {
        const err = await res.json();
        showStatus(err.error || "Update failed", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (cat: Category | SubCategory) => {
    try {
      const nextVal = !cat.isActive;
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, isActive: nextVal }),
      });
      if (res.ok) {
        showStatus(`Updated "${cat.name}" visibility`);
        fetchCategories();
      } else {
        const err = await res.json();
        showStatus(err.error || "Update failed", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const promptDelete = (cat: Category | SubCategory) => {
    setDeletingCategory(cat as Category);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(deletingCategory.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      showStatus(`Deleted category "${deletingCategory.name}"`);
      await fetchCategories();
    } catch (err: any) {
      showStatus(err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((parent) => {
    const matchesDept = deptFilter === "ALL" || parent.department === deptFilter;
    const parentMatchesSearch =
      parent.name.toLowerCase().includes(search.toLowerCase()) ||
      parent.slug.toLowerCase().includes(search.toLowerCase());
    const childrenMatchSearch = (parent.children || []).some(
      (ch) =>
        ch.name.toLowerCase().includes(search.toLowerCase()) ||
        ch.slug.toLowerCase().includes(search.toLowerCase())
    );
    return matchesDept && (parentMatchesSearch || childrenMatchSearch);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal-700 flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-crimson-600" />
            <span>Categories &amp; Subcategories Hierarchy</span>
          </h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Organize main departments, primary cuts, and subcategory preparation options.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCategories}
            className="flex items-center gap-2 px-3.5 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-semibold rounded-xl shadow-subtle transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Main Category
          </button>
        </div>
      </div>

      {/* Global Status Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in ${
            feedback.type === "success"
              ? "bg-forest-50 border border-forest-200 text-forest-800"
              : "bg-crimson-50 border border-crimson-200 text-crimson-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-forest-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-crimson-600 flex-shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Search & Department Filters */}
      <div className="p-4 bg-white rounded-2xl border border-cream-300 shadow-subtle flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories or subcategories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-cream-50 border border-cream-200 rounded-xl focus:outline-none focus:border-amberGold-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-charcoal-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Department:
          </span>
          <div className="inline-flex rounded-xl p-1 bg-cream-100 border border-cream-200">
            {(["ALL", "MEAT", "GROCERY"] as const).map((dept) => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  deptFilter === dept
                    ? "bg-white text-charcoal-800 shadow-xs"
                    : "text-charcoal-500 hover:text-charcoal-800"
                }`}
              >
                {dept === "ALL" ? "All" : dept === "MEAT" ? "🥩 Meat" : "🛒 Grocery"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hierarchical Categories Listing */}
      <div className="space-y-3">
        {loading && categories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-cream-300 space-y-2">
            <div className="w-6 h-6 border-2 border-crimson-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-charcoal-400 font-mono">Loading categories &amp; subcategories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-cream-300 space-y-3">
            <Layers className="w-10 h-10 text-charcoal-300 mx-auto" />
            <h3 className="font-serif text-sm font-semibold text-charcoal-700">No categories found</h3>
            <p className="text-xs text-charcoal-400">
              {search ? "No matching categories for your search query." : "Click 'Add Main Category' to create your first department."}
            </p>
          </div>
        ) : (
          filteredCategories.map((parent) => {
            const isExpanded = expandedParents[parent.id] !== false;
            const subcategories = parent.children || [];

            return (
              <div
                key={parent.id}
                className="bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-subtle transition-all"
              >
                {/* Parent Category Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-cream-50/70 border-b border-cream-200">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:bg-cream-200 transition cursor-pointer"
                      title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-charcoal-700" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-charcoal-700" />
                      )}
                    </button>

                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-cream-200 relative border border-cream-300 flex-shrink-0">
                      {parent.imageUrl ? (
                        <img
                          src={parent.imageUrl}
                          alt={parent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Layers className="w-5 h-5 text-charcoal-400 m-auto mt-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif text-base font-bold text-charcoal-800 truncate">
                          {parent.name}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            parent.department === "MEAT"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {parent.department === "MEAT" ? "🥩 Meat" : "🛒 Grocery"}
                        </span>
                        <span className="font-mono text-[11px] text-charcoal-400">
                          /{parent.slug}
                        </span>
                      </div>
                      <p className="text-xs text-charcoal-500 truncate mt-0.5 max-w-md">
                        {parent.description || "No description configured."}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Metrics */}
                  <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-cream-300 rounded-lg font-mono text-[11px] font-bold text-charcoal-700 shadow-2xs"
                        title="Assigned products"
                      >
                        <Package className="w-3 h-3 text-amberGold-600" />
                        {parent._count?.products || 0} Products
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-cream-300 rounded-lg font-mono text-[11px] font-bold text-charcoal-700 shadow-2xs"
                        title="Configured subcategories"
                      >
                        <FolderTree className="w-3 h-3 text-emerald-600" />
                        {subcategories.length} Subcategories
                      </span>
                    </div>

                    <div className="h-4 w-px bg-cream-300 hidden sm:block" />

                    {/* Coming Soon Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleComingSoon(parent)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer ${
                        parent.isComingSoon
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {parent.isComingSoon ? "Coming Soon" : "Live Ordering"}
                    </button>

                    {/* Active/Disabled Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(parent)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                        parent.isActive !== false
                          ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {parent.isActive !== false ? "Active" : "Disabled"}
                    </button>

                    {/* Add Subcategory Trigger */}
                    <button
                      onClick={() => openCreateModal(parent.id)}
                      className="px-2.5 py-1 bg-crimson-50 hover:bg-crimson-100 text-crimson-700 border border-crimson-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                      title="Add a subcategory under this category"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Subcategory</span>
                    </button>

                    {/* Edit Parent */}
                    <button
                      onClick={() => openEditModal(parent)}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-charcoal-800 hover:bg-cream-200 transition cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Parent */}
                    <button
                      onClick={() => promptDelete(parent)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Container */}
                {isExpanded && (
                  <div className="divide-y divide-cream-200 bg-white">
                    {subcategories.length === 0 ? (
                      <div className="py-4 px-6 text-xs text-charcoal-400 flex items-center justify-between">
                        <span className="italic flex items-center gap-2">
                          <CornerDownRight className="w-4 h-4 text-cream-400" />
                          No subcategories configured under {parent.name}.
                        </span>
                        <button
                          onClick={() => openCreateModal(parent.id)}
                          className="text-[11px] font-bold text-crimson-600 hover:underline cursor-pointer"
                        >
                          + Add First Subcategory
                        </button>
                      </div>
                    ) : (
                      subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="py-3 px-4 sm:px-6 pl-8 sm:pl-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-cream-50/50 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <CornerDownRight className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-cream-200 relative border border-cream-300 flex-shrink-0">
                              {sub.imageUrl ? (
                                <img
                                  src={sub.imageUrl}
                                  alt={sub.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Layers className="w-4 h-4 text-charcoal-400 m-auto mt-2.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-charcoal-800">
                                  {sub.name}
                                </span>
                                <span className="font-mono text-[10px] text-charcoal-400">
                                  /{sub.slug}
                                </span>
                              </div>
                              {sub.description && (
                                <p className="text-[11px] text-charcoal-500 truncate max-w-sm mt-0.5">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cream-100 text-charcoal-700 rounded-md font-mono font-bold text-[10px]">
                              <Package className="w-3 h-3 text-charcoal-400" />
                              {sub._count?.products || 0}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleComingSoon(sub)}
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase transition cursor-pointer ${
                                sub.isComingSoon
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}
                            >
                              {sub.isComingSoon ? "Coming Soon" : "Live"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(sub)}
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                                sub.isActive !== false
                                  ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {sub.isActive !== false ? "Active" : "Disabled"}
                            </button>

                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1 rounded text-charcoal-500 hover:text-charcoal-800 hover:bg-cream-200 transition cursor-pointer"
                              title="Edit Subcategory"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={() => promptDelete(sub)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Subcategory"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit ${form.parentId ? "Subcategory" : "Category"}` : `Create New ${form.parentId ? "Subcategory" : "Category"}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Parent Category (Hierarchy Level)
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 font-medium focus:outline-none focus:border-amberGold-500"
            >
              <option value="">— None (This is a Main Category) —</option>
              {allFlatCategories
                .filter((c) => !isEditing || c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.department === "MEAT" ? "🥩" : "🛒"} {c.name} {c.parentId ? `(Sub of ${allFlatCategories.find(p => p.id === c.parentId)?.name || "parent"})` : "(Main Category)"}
                  </option>
                ))}
            </select>
            <span className="text-[10px] text-charcoal-400 mt-1 block">
              Leave empty to create a top-level category, or select a parent to create a subcategory.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Biryani Cut or Boneless"
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. biryani-cut"
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 font-medium focus:outline-none focus:border-amberGold-500"
              >
                <option value="MEAT">🥩 Meat (Chicken, Mutton, Eggs)</option>
                <option value="GROCERY">🛒 Grocery &amp; Staples</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Display Sort Order
              </label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description for catalog..."
              className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-charcoal-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded text-crimson-600 focus:ring-crimson-500"
              />
              <span>Active in Store</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-charcoal-700">
              <input
                type="checkbox"
                checked={form.isComingSoon}
                onChange={(e) => setForm({ ...form, isComingSoon: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Mark as Coming Soon</span>
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-cream-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold hover:bg-cream-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              className="text-xs px-5 py-2"
            >
              {isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Category Deletion"
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Are you sure you want to delete the category{" "}
            <strong className="text-charcoal-800">{deletingCategory?.name}</strong>?
          </p>

          {deletingCategory?._count && (deletingCategory._count.products > 0 || (deletingCategory._count.children || 0) > 0) && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <strong>Dependency Warning:</strong>
              <p>
                This category has {deletingCategory._count.products} associated product(s) and {deletingCategory._count.children || 0} subcategory/subcategories.
                The server will prevent deletion until these dependencies are reassigned or removed.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold hover:bg-cream-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeleting}
              onClick={confirmDelete}
              className="text-xs px-4 py-2"
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
