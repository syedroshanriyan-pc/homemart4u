"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HalalBadge } from "@/components/ui/HalalBadge";
import { useRealTime } from "@/lib/useRealTime";
import { FoodTypeBadge, FoodType } from "@/components/ui/FoodTypeBadge";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Check,
  X,
  Tag,
  Sparkles,
  ShoppingBag,
  Flame,
  Truck,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Eye,
} from "lucide-react";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  department: "MEAT" | "GROCERY";
}

interface ProductVariantData {
  id: string;
  name: string;
  pricingType: string;
  quantityValue: number;
  quantityUnit: string;
  priceMinor: number;
  mrpMinor?: number | null;
  isAvailable: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  description?: string | null;
  productType: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  isActive: boolean;
  foodType?: "VEG" | "NON_VEG" | "EGG";
  isHalal: boolean;
  mrpMinor?: number | null;
  savePriceText?: string | null;
  badgeText?: string | null;
  category?: CategoryData;
  variants: ProductVariantData[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<"ALL" | "MEAT" | "GROCERY">("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");

  // Modal State (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Dedicated Quick Variants Modal State
  const [variantModalProduct, setVariantModalProduct] = useState<ProductItem | null>(null);
  const [newVariantForm, setNewVariantForm] = useState({
    name: "500g",
    quantityValue: "500",
    quantityUnit: "g",
    priceRs: "",
    mrpRs: "",
    isAvailable: true,
  });
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Multi-variant state for Create/Edit Modal
  interface FormVariant {
    id?: string;
    name: string;
    quantityValue: number | string;
    quantityUnit: string;
    priceRs: string;
    mrpRs: string;
    isAvailable: boolean;
  }
  const [formVariants, setFormVariants] = useState<FormVariant[]>([
    { name: "500g", quantityValue: "500", quantityUnit: "g", priceRs: "", mrpRs: "", isAvailable: true },
    { name: "1 kg", quantityValue: "1000", quantityUnit: "g", priceRs: "", mrpRs: "", isAvailable: true },
  ]);

  // Form Fields
  const [department, setDepartment] = useState<"MEAT" | "GROCERY">("MEAT");
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("WEIGHT");
  const [imageUrl, setImageUrl] = useState("");

  // Pricing & Save Tag
  const [sellingPriceRs, setSellingPriceRs] = useState("");
  const [mrpRs, setMrpRs] = useState("");
  const [savePriceText, setSavePriceText] = useState("");

  // Tags & Badges (Halal for Meat, Daily Essentials for Groceries)
  const [foodType, setFoodType] = useState<FoodType>("NON_VEG");
  const [isHalal, setIsHalal] = useState(true);
  const [badgeText, setBadgeText] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  // Variant details
  const [variantName, setVariantName] = useState("1 kg Pack");
  const [quantityValue, setQuantityValue] = useState("1000");
  const [quantityUnit, setQuantityUnit] = useState("g");

  // New subcategory inline creator
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch catalog
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
      ]);

      let loadedCats: CategoryData[] = [];
      if (catRes.ok) {
        const c = await catRes.json();
        loadedCats = c.categories || [];
        setCategories(loadedCats);
      }

      if (prodRes.ok) {
        const d = await prodRes.json();
        setProducts(d.products || []);
      }
    } catch (e) {
      console.error(e);
      showStatus("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showStatus = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Filtered categories for current selected department
  const filteredCategoriesForDept = useMemo(() => {
    return categories.filter((c) => c.department === department);
  }, [categories, department]);

  // Handle department change in form
  const handleDepartmentChange = (newDept: "MEAT" | "GROCERY") => {
    setDepartment(newDept);
    // Find matching categories in the new department
    const matchingCats = categories.filter((c) => c.department === newDept);
    if (matchingCats.length > 0) {
      setCategoryId(matchingCats[0].id);
    } else {
      setCategoryId("");
    }

    // Set intelligent defaults for tags
    if (newDept === "MEAT") {
      setFoodType("NON_VEG");
      setIsHalal(true);
      setBadgeText("");
      setVariantName("1 kg Pack");
      setQuantityValue("1000");
      setQuantityUnit("g");
      setProductType("WEIGHT");
    } else {
      setFoodType("VEG");
      setIsHalal(false);
      setBadgeText("Daily Essentials at Wholesale Prices");
      setVariantName("Standard Pack");
      setQuantityValue("1");
      setQuantityUnit("pack");
      setProductType("FIXED");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    handleDepartmentChange("MEAT");
    setName("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setSellingPriceRs("");
    setMrpRs("");
    setSavePriceText("");
    setBadgeText("");
    setIsAvailable(true);
    setShowNewCatInput(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    const prodDept = (prod.category?.department as "MEAT" | "GROCERY") || "MEAT";
    setDepartment(prodDept);
    setCategoryId(prod.categoryId || "");
    setName(prod.name);
    setSlug(prod.slug);
    setDescription(prod.description || "");
    setImageUrl(prod.imageUrl || "");
    setProductType(prod.productType || "WEIGHT");

    const primaryVariant = prod.variants?.[0];
    const sellPrice = primaryVariant ? (primaryVariant.priceMinor / 100).toString() : "";
    setSellingPriceRs(sellPrice);

    const mrpMinor = primaryVariant?.mrpMinor ?? prod.mrpMinor;
    const mrp = mrpMinor ? (mrpMinor / 100).toString() : "";
    setMrpRs(mrp);

    setSavePriceText(prod.savePriceText || "");
    setBadgeText(prod.badgeText || (prodDept === "GROCERY" ? "Daily Essentials at Wholesale Prices" : ""));
    setFoodType(prod.foodType || (prodDept === "MEAT" ? "NON_VEG" : "VEG"));
    setIsHalal(Boolean(prod.isHalal));
    setIsAvailable(prod.isAvailable);

    if (primaryVariant) {
      setVariantName(primaryVariant.name || "Standard Pack");
      setQuantityValue((primaryVariant.quantityValue || 1000).toString());
      setQuantityUnit(primaryVariant.quantityUnit || "g");
    }

    setShowNewCatInput(false);
    setIsModalOpen(true);
  };

  // Toggle Stock directly from table
  const handleToggleStock = async (productId: string) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/toggle-availability`, {
        method: "POST",
      });
      if (res.ok) {
        showStatus("Stock status updated");
        fetchProducts();
      }
    } catch {
      showStatus("Error updating stock", "error");
    }
  };

  // Delete / Archive Product
  const handleDeleteProduct = async (product: ProductItem) => {
    if (!confirm(`Are you sure you want to remove "${product.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}?hard=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        showStatus(`"${product.name}" removed successfully`);
        fetchProducts();
      } else {
        showStatus("Failed to delete product", "error");
      }
    } catch {
      showStatus("Error deleting product", "error");
    }
  };

  // Create subcategory inline
  const handleCreateSubcategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const slugVal = newCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          slug: slugVal,
          department,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCategories((prev) => [...prev, data.category]);
        setCategoryId(data.category.id);
        setNewCatName("");
        setShowNewCatInput(false);
        showStatus(`Subcategory "${data.category.name}" created!`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create subcategory");
      }
    } catch {
      alert("Error creating subcategory");
    } finally {
      setCreatingCat(false);
    }
  };

    // Preset variant adder for main form
  const handleAddPresetVariant = (preset: "500g" | "1kg" | "1.5kg" | "2kg" | "custom") => {
    const presetsMap = {
      "500g": { name: "500g", quantityValue: 500, quantityUnit: "g" },
      "1kg": { name: "1 kg", quantityValue: 1000, quantityUnit: "g" },
      "1.5kg": { name: "1.5 kg", quantityValue: 1500, quantityUnit: "g" },
      "2kg": { name: "2 kg", quantityValue: 2000, quantityUnit: "g" },
      custom: { name: "", quantityValue: 1000, quantityUnit: "g" },
    };
    const chosen = presetsMap[preset];
    setFormVariants((prev) => [
      ...prev,
      {
        name: chosen.name,
        quantityValue: chosen.quantityValue,
        quantityUnit: chosen.quantityUnit,
        priceRs: "",
        mrpRs: "",
        isAvailable: true,
      },
    ]);
  };

  const handleRemoveFormVariant = (index: number) => {
    if (formVariants.length <= 1) {
      alert("A product must have at least one variant.");
      return;
    }
    setFormVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateFormVariant = (index: number, field: string, val: any) => {
    setFormVariants((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, [field]: val } : v))
    );
  };

  // Quick Variant Modal actions
  const openVariantsModal = (prod: ProductItem) => {
    setVariantModalProduct(prod);
    setNewVariantForm({
      name: "500g",
      quantityValue: "500",
      quantityUnit: "g",
      priceRs: "",
      mrpRs: "",
      isAvailable: true,
    });
  };

  const handleAddQuickVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantModalProduct) return;
    if (!newVariantForm.name.trim() || !newVariantForm.priceRs || isNaN(parseFloat(newVariantForm.priceRs))) {
      alert("Please enter variant name and a valid selling price");
      return;
    }

    setIsAddingVariant(true);
    try {
      const res = await fetch(`/api/admin/products/${variantModalProduct.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVariantForm.name.trim(),
          quantityValue: parseInt(newVariantForm.quantityValue, 10) || 1000,
          quantityUnit: newVariantForm.quantityUnit || "g",
          priceRs: parseFloat(newVariantForm.priceRs),
          mrpRs: newVariantForm.mrpRs ? parseFloat(newVariantForm.mrpRs) : null,
          isAvailable: newVariantForm.isAvailable,
        }),
      });

      if (res.ok) {
        showStatus(`Added "${newVariantForm.name}" variant successfully!`);
        // Refresh product in modal and list
        const updatedRes = await fetch("/api/admin/products");
        if (updatedRes.ok) {
          const d = await updatedRes.json();
          setProducts(d.products || []);
          const updatedProd = (d.products || []).find((p: any) => p.id === variantModalProduct.id);
          if (updatedProd) setVariantModalProduct(updatedProd);
        }
        setNewVariantForm({
          name: "1.5 kg",
          quantityValue: "1500",
          quantityUnit: "g",
          priceRs: "",
          mrpRs: "",
          isAvailable: true,
        });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add variant");
      }
    } catch {
      alert("Error adding variant");
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleDeleteQuickVariant = async (variantId: string, variantName: string) => {
    if (!variantModalProduct) return;
    if (variantModalProduct.variants.length <= 1) {
      alert("Cannot delete the only variant. Add another variant first.");
      return;
    }
    if (!confirm(`Are you sure you want to remove variant "${variantName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${variantModalProduct.id}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showStatus(`Variant "${variantName}" deleted`);
        const updatedRes = await fetch("/api/admin/products");
        if (updatedRes.ok) {
          const d = await updatedRes.json();
          setProducts(d.products || []);
          const updatedProd = (d.products || []).find((p: any) => p.id === variantModalProduct.id);
          if (updatedProd) setVariantModalProduct(updatedProd);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete variant");
      }
    } catch {
      alert("Error deleting variant");
    }
  };

  const handleToggleQuickVariantStock = async (variantId: string, current: boolean) => {
    if (!variantModalProduct) return;
    try {
      const res = await fetch(`/api/admin/products/${variantModalProduct.id}/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !current }),
      });
      if (res.ok) {
        showStatus("Variant availability toggled");
        const updatedRes = await fetch("/api/admin/products");
        if (updatedRes.ok) {
          const d = await updatedRes.json();
          setProducts(d.products || []);
          const updatedProd = (d.products || []).find((p: any) => p.id === variantModalProduct.id);
          if (updatedProd) setVariantModalProduct(updatedProd);
        }
      }
    } catch {
      showStatus("Error toggling variant stock", "error");
    }
  };

  // Save Product (Create or Edit)
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      alert("Please provide product name and slug");
      return;
    }
    if (!sellingPriceRs || isNaN(parseFloat(sellingPriceRs))) {
      alert("Please enter a valid selling price");
      return;
    }

    // Default to first category of department if none selected
    let finalCatId = categoryId;
    if (!finalCatId && filteredCategoriesForDept.length > 0) {
      finalCatId = filteredCategoriesForDept[0].id;
    }

    if (!finalCatId) {
      alert("Please select or create a subcategory");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceMinor = Math.round(parseFloat(sellingPriceRs) * 100);
      const mrpMinor = mrpRs && !isNaN(parseFloat(mrpRs)) && parseFloat(mrpRs) > 0
        ? Math.round(parseFloat(mrpRs) * 100)
        : null;

      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId: finalCatId,
        description: description.trim() || null,
        productType,
        imageUrl: imageUrl.trim() || null,
        priceMinor,
        mrpMinor,
        savePriceText: savePriceText.trim() || null,
        badgeText: badgeText.trim() || (department === "GROCERY" ? "Daily Essentials at Wholesale Prices" : null),
        foodType,
        isHalal,
        isAvailable,
        variantName: variantName.trim() || "Standard Pack",
        quantityValue: parseInt(quantityValue, 10) || 1000,
        quantityUnit,
      };

      let res: Response;
      if (editingProduct) {
        // Edit existing
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        showStatus(editingProduct ? "Product updated successfully!" : "Product created successfully!");
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save product");
      }
    } catch {
      alert("Error saving product");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Photo Presets
  const meatPhotoPresets = [
    { label: "🍗 Chicken Curry Cut", url: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80" },
    { label: "🥩 Boneless Breast", url: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80" },
    { label: "🍗 Drumsticks (Legs)", url: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=600&q=80" },
    { label: "🐟 Fresh Rohu Fish", url: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=600&q=80" },
    { label: "🥚 Country Desi Eggs", url: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80" },
  ];

  const groceryPhotoPresets = [
    { label: "🥛 Nandini Fresh Milk", url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80" },
    { label: "🧈 Pure Desi Ghee", url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80" },
    { label: "🌾 Chakki Whole Atta", url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80" },
    { label: "🥤 Cold Soft Drink", url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80" },
    { label: "🧅 Fresh Farm Veggies", url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80" },
  ];

  // Live Savings Calculation for Form Preview
  const computedSellingRs = parseFloat(sellingPriceRs) || 0;
  const computedMrpRs = parseFloat(mrpRs) || 0;
  const computedSavings = computedMrpRs > computedSellingRs ? computedMrpRs - computedSellingRs : 0;
  const computedDiscountPct = computedMrpRs > 0 && computedSavings > 0
    ? Math.round((computedSavings / computedMrpRs) * 100)
    : 0;
  const liveSaveTag = savePriceText.trim()
    ? savePriceText.trim()
    : (computedSavings > 0 ? `SAVE ₹${computedSavings}` : null);

  // Selected Category Name for Preview
  const currentCategoryObj = categories.find((c) => c.id === categoryId);

  // Filter products for Table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Dept filter
      if (deptFilter !== "ALL") {
        const pDept = p.category?.department || "MEAT";
        if (pDept !== deptFilter) return false;
      }

      // Stock filter
      if (stockFilter === "IN_STOCK" && !p.isAvailable) return false;
      if (stockFilter === "OUT_OF_STOCK" && p.isAvailable) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = p.category?.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesSlug) return false;
      }

      return true;
    });
  }, [products, deptFilter, stockFilter, search]);

  // Catalog Stats
  const totalCount = products.length;
  const meatCount = products.filter((p) => (p.category?.department || "MEAT") === "MEAT").length;
  const groceryCount = products.filter((p) => p.category?.department === "GROCERY").length;
  const inStockCount = products.filter((p) => p.isAvailable).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 ${statusMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
            }`}
        >
          {statusMessage.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Product Catalog
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Easily manage cuts, groceries, daily pricing, save price tags, 100% Halal badges, and Veg/Non-Veg classifications.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={openCreateModal}
          className="self-start md:self-center bg-rose-600 hover:bg-rose-700 text-white shadow-sm rounded-xl px-4 py-2.5"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="font-semibold text-xs tracking-wide">Add New Product</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Items</span>
          <span className="font-serif text-2xl font-bold text-stone-900 mt-0.5 block">{totalCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block flex items-center gap-1">
            🥩 Meat & Poultry
          </span>
          <span className="font-serif text-2xl font-bold text-stone-900 mt-0.5 block">{meatCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block flex items-center gap-1">
            🛒 Groceries
          </span>
          <span className="font-serif text-2xl font-bold text-stone-900 mt-0.5 block">{groceryCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">In-Stock</span>
          <span className="font-serif text-2xl font-bold text-emerald-600 mt-0.5 block">{inStockCount} / {totalCount}</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        {/* Department Switcher */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setDeptFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${deptFilter === "ALL"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
              }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setDeptFilter("MEAT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${deptFilter === "MEAT"
                ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-200"
                : "text-stone-600 hover:text-stone-900"
              }`}
          >
            <span>🥩</span> Meat ({meatCount})
          </button>
          <button
            onClick={() => setDeptFilter("GROCERY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${deptFilter === "GROCERY"
                ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200"
                : "text-stone-600 hover:text-stone-900"
              }`}
          >
            <span>🛒</span> Groceries ({groceryCount})
          </button>
        </div>

        {/* Search & Stock filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
            />
          </div>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none"
          >
            <option value="ALL">All Stock</option>
            <option value="IN_STOCK">In Stock Only</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-stone-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-rose-500" />
            <span>Loading product catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-xs text-stone-500 flex flex-col items-center justify-center gap-2">
            <ShoppingBag className="w-8 h-8 text-stone-300" />
            <p className="font-semibold text-stone-700">No products found matching filters.</p>
            <button
              onClick={() => {
                setSearch("");
                setDeptFilter("ALL");
                setStockFilter("ALL");
              }}
              className="text-rose-600 hover:underline text-xs mt-1"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] uppercase text-stone-500 font-semibold tracking-wider">
                  <th className="py-3.5 px-4">Item Details</th>
                  <th className="py-3.5 px-4">Section / Category</th>
                  <th className="py-3.5 px-4">Tags & Certifications</th>
                  <th className="py-3.5 px-4">Selling Price & Savings</th>
                  <th className="py-3.5 px-4 text-center">In-Stock Toggle</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const firstVariant = p.variants?.[0];
                  const priceRs = firstVariant ? Math.round(firstVariant.priceMinor / 100) : 0;
                  const variantMrp = firstVariant?.mrpMinor ?? p.mrpMinor;
                  const mrpPrice = variantMrp ? Math.round(variantMrp / 100) : 0;
                  const savings = mrpPrice > priceRs ? mrpPrice - priceRs : 0;
                  const effectiveSaveTag = p.savePriceText || (savings > 0 ? `Save ₹${savings}` : null);
                  const isMeat = (p.category?.department || "MEAT") === "MEAT";

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Item Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                            {p.imageUrl ? (
                              <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                                No Img
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 text-sm line-clamp-1">{p.name}</p>
                            <p className="text-[10px] text-stone-400 font-mono mt-0.5">/{p.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Section & Category */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${isMeat ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                          }`}>
                          {isMeat ? "🥩 Meat" : "🛒 Grocery"}
                        </span>
                        <p className="text-xs font-medium text-stone-700 mt-1">
                          {p.category?.name || "General"}
                        </p>
                      </td>

                      {/* Tags & Certifications */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Food Type Badge */}
                          <FoodTypeBadge type={p.foodType || (isMeat ? "NON_VEG" : "VEG")} showLabel={true} size="sm" />

                          {/* Halal Badge for Meat */}
                          {isMeat && Boolean(p.isHalal) && (
                            <HalalBadge size="sm" variant="outline" />
                          )}

                          {/* Grocery Badge for Groceries */}
                          {!isMeat && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                              <span>{p.badgeText || "Daily Essentials at Wholesale Prices"}</span>
                            </span>
                          )}

                          {/* Save Price Tag */}
                          {effectiveSaveTag && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                              {effectiveSaveTag}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Selling Price & MRP */}
                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-base font-bold text-stone-900">
                            ₹{priceRs}
                          </span>
                          {mrpPrice > priceRs && (
                            <span className="font-mono text-xs text-stone-400 line-through">
                              ₹{mrpPrice}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          {firstVariant?.name || "Standard Pack"}
                        </span>
                      </td>

                      {/* In-Stock Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStock(p.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all shadow-2xs ${p.isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                              : "bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300"
                            }`}
                        >
                          {p.isAvailable ? "IN STOCK" : "SOLD OUT"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : "Add New Product"}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-6">
          {/* STEP 1: SECTION SELECTION (MEAT VS GROCERY) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
              Step 1: Select Department / Section *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDepartmentChange("MEAT")}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 ${department === "MEAT"
                    ? "border-rose-600 bg-rose-50/70 text-rose-950 shadow-xs ring-1 ring-rose-500/30"
                    : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                  }`}
              >
                <span className="text-2xl">🥩</span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Meat & Poultry</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Fresh Chicken, Masala Cuts, Fish, Seafood, Farm Eggs
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDepartmentChange("GROCERY")}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 ${department === "GROCERY"
                    ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30"
                    : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                  }`}
              >
                <span className="text-2xl">🛒</span>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Daily Groceries</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Dairy, Atta, Rice, Ghee, Spices, Veggies, Beverages
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* STEP 2: SUBCATEGORY SELECTION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Step 2: Subcategory (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                {showNewCatInput ? "Cancel" : "+ Add New Subcategory"}
              </button>
            </div>

            {showNewCatInput ? (
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`New ${department === "MEAT" ? "Meat" : "Grocery"} subcategory name...`}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCreateSubcategory}
                  isLoading={creatingCat}
                  className="text-xs"
                >
                  Save Subcategory
                </Button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400/50"
              >
                {filteredCategoriesForDept.length === 0 && (
                  <option value="">No subcategories yet (General)</option>
                )}
                {filteredCategoriesForDept.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* STEP 3: ITEM DETAILS & PHOTO */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
              Step 3: Item Name, Description & Image
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={department === "MEAT" ? "e.g. Fresh Chicken Curry Cut 1kg" : "e.g. Aashirvaad Whole Wheat Atta 5kg"}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingProduct) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-400/50 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-mono text-[11px] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Product highlights, cuts, quality, freshness..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none text-xs"
              />

              {/* Quick Image Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Quick Photos:</span>
                {(department === "MEAT" ? meatPhotoPresets : groceryPhotoPresets).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 4: PRICING & SAVE PRICE TAG */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
              Step 4: Pricing & Save Price Tag
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Selling Price (₹ Rupees) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="250"
                    value={sellingPriceRs}
                    onChange={(e) => setSellingPriceRs(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Original MRP (₹ Rupees) (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    placeholder="295"
                    value={mrpRs}
                    onChange={(e) => setMrpRs(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Custom Save Tag (Optional)
                </label>
                <input
                  type="text"
                  placeholder={computedSavings > 0 ? `SAVE ₹${computedSavings}` : "e.g. SAVE ₹45"}
                  value={savePriceText}
                  onChange={(e) => setSavePriceText(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Savings preview indicator */}
            {computedSavings > 0 && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">
                    Customer saves <strong>₹{computedSavings}</strong> ({computedDiscountPct}% OFF)
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                  {liveSaveTag}
                </span>
              </div>
            )}
          </div>

          {/* STEP 5: TAGS & CERTIFICATIONS (VEG / NON-VEG & HALAL) */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
              Step 5: Food Type & Halal Tag
            </label>

            {/* Food Type Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 mb-1.5">
                Food Classification *
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* VEG */}
                <button
                  type="button"
                  onClick={() => setFoodType("VEG")}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition ${foodType === "VEG"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs ring-1 ring-emerald-500/30"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                >
                  <FoodTypeBadge type="VEG" showLabel={false} size="sm" />
                  <span className="text-xs">Pure Veg</span>
                </button>

                {/* NON-VEG */}
                <button
                  type="button"
                  onClick={() => setFoodType("NON_VEG")}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition ${foodType === "NON_VEG"
                      ? "border-rose-600 bg-rose-50 text-rose-800 font-bold shadow-xs ring-1 ring-rose-500/30"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                >
                  <FoodTypeBadge type="NON_VEG" showLabel={false} size="sm" />
                  <span className="text-xs">Non-Veg</span>
                </button>

                {/* EGG */}
                <button
                  type="button"
                  onClick={() => setFoodType("EGG")}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition ${foodType === "EGG"
                      ? "border-amber-500 bg-amber-50 text-amber-800 font-bold shadow-xs ring-1 ring-amber-500/30"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                >
                  <FoodTypeBadge type="EGG" showLabel={false} size="sm" />
                  <span className="text-xs">Contains Egg</span>
                </button>
              </div>
            </div>

            {/* Tag / Badge: Halal Tag for Meat, Daily Essentials at Wholesale Prices for Groceries */}
            {department === "MEAT" ? (
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HalalBadge size="sm" variant="outline" />
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">100% Halal Certified Tag</h5>
                    <p className="text-[10px] text-stone-500">
                      Display authentic green Halal badge on product card above price
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHalal}
                    onChange={(e) => setIsHalal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950">Grocery Tag (Shown in place of Halal tag)</h5>
                      <p className="text-[10px] text-emerald-700">Tag rendered directly above price on the grocery card</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Grocery Tag
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="e.g. Daily Essentials at Wholesale Prices"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl text-stone-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Quick Presets:</span>
                  {[
                    "Daily Essentials at Wholesale Prices",
                    "discounted Wholesale Price",
                    "100% Farm Fresh Daily",
                    "Best Price Guaranteed",
                    "Zero Preservatives",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBadgeText(preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition ${badgeText === preset
                          ? "bg-emerald-600 text-white font-bold shadow-2xs"
                          : "bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBadgeText("")}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 6: MULTI-VARIANT & WEIGHT PACK DETAILS (500g, 1kg, 1.5kg, 2kg, etc.) */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Step 6: Product Portions &amp; Weight Variants
                </label>
                <p className="text-[11px] text-stone-500">
                  Add custom pack sizes (e.g. 500g, 1kg, 1.5kg, 2kg) with independent prices and live stock toggles.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-stone-400">Quick Add:</span>
                <button
                  type="button"
                  onClick={() => handleAddPresetVariant("500g")}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition"
                >
                  + 500g
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetVariant("1kg")}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition"
                >
                  + 1 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetVariant("1.5kg")}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition"
                >
                  + 1.5 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetVariant("2kg")}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition"
                >
                  + 2 kg
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetVariant("custom")}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition"
                >
                  + Custom
                </button>
              </div>
            </div>

            {/* List of Form Variants */}
            <div className="space-y-2.5">
              {formVariants.map((v, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs"
                >
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 w-full">
                    {/* Variant Name */}
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Variant / Pack Label
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500g, 1 kg Pack"
                        value={v.name}
                        onChange={(e) => handleUpdateFormVariant(idx, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-800 font-semibold focus:outline-none"
                      />
                    </div>

                    {/* Weight / Qty Value */}
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        required
                        value={v.quantityValue}
                        onChange={(e) => handleUpdateFormVariant(idx, "quantityValue", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-800 font-mono focus:outline-none"
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Unit
                      </label>
                      <select
                        value={v.quantityUnit}
                        onChange={(e) => handleUpdateFormVariant(idx, "quantityUnit", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                      >
                        <option value="g">Grams (g)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="pc">Piece (pc)</option>
                        <option value="pack">Pack</option>
                      </select>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="₹"
                        value={v.priceRs}
                        onChange={(e) => handleUpdateFormVariant(idx, "priceRs", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* MRP */}
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                        MRP (₹)
                      </label>
                      <input
                        type="number"
                        step="1"
                        placeholder="₹"
                        value={v.mrpRs}
                        onChange={(e) => handleUpdateFormVariant(idx, "mrpRs", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl text-stone-500 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Actions: Stock toggle & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateFormVariant(idx, "isAvailable", !v.isAvailable)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                        v.isAvailable
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-stone-200 border-stone-300 text-stone-600"
                      }`}
                    >
                      {v.isAvailable ? "IN STOCK" : "OUT"}
                    </button>
                    {formVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFormVariant(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove Variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE CUSTOMER-FACING CARD PREVIEW */}
          <div className="space-y-2 pt-2 border-t border-stone-200">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-stone-500" />
              Live Storefront Preview
            </span>

            <div className="p-4 bg-stone-100 rounded-3xl flex justify-center">
              <div className="w-full max-w-[260px] bg-white rounded-2xl border border-stone-200 shadow-sm p-3.5 flex flex-col justify-between">
                {/* Image Box */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-50 mb-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80"}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Top-Right Veg / Non-Veg Badge */}
                  <div className="absolute top-2 right-2 bg-white/95 p-1 rounded-md shadow-xs">
                    <FoodTypeBadge type={foodType} showLabel={false} size="sm" />
                  </div>

                  {/* Save Tag */}
                  {liveSaveTag && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                        {liveSaveTag}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-medium flex items-center gap-1">
                      <Truck className="w-2.5 h-2.5 text-amber-300" />
                      ~20 Min
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <FoodTypeBadge type={foodType} showLabel={true} size="sm" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 truncate">
                      &bull; {currentCategoryObj?.name || (department === "MEAT" ? "Meat" : "Groceries")}
                    </span>
                  </div>

                  <h4 className="font-semibold text-xs text-stone-900 line-clamp-1">
                    {name || "Product Name Here"}
                  </h4>

                  {/* Tag / Badge: Halal for Meat, Daily Essentials at Wholesale Prices for Groceries */}
                  {department === "MEAT" ? (
                    isHalal && (
                      <div className="pt-0.5">
                        <HalalBadge size="sm" variant="outline" />
                      </div>
                    )
                  ) : (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                        <span>{badgeText || "Daily Essentials at Wholesale Prices"}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Pricing & Add */}
                <div className="pt-2.5 border-t border-stone-100 mt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-sm font-bold text-stone-900">
                      ₹{computedSellingRs || 0}
                    </span>
                    {computedMrpRs > computedSellingRs && (
                      <span className="font-mono text-[10px] text-stone-400 line-through">
                        ₹{computedMrpRs}
                      </span>
                    )}
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> ADD
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white px-6 font-semibold shadow-sm"
            >
              {editingProduct ? "Update Product" : "Save Product to Catalog"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
