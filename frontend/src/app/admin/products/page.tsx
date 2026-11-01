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
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
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

interface CustomizationOptionData {
  id: string;
  name: string;
  priceDeltaMinor: number;
  isActive: boolean;
  displayOrder: number;
}

interface CustomizationGroupData {
  id: string;
  name: string;
  selectionType: string; // SINGLE, MULTIPLE
  isRequired: boolean;
  displayOrder: number;
  options: CustomizationOptionData[];
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
  customizationGroups?: CustomizationGroupData[];
}

interface FormVariant {
  id?: string;
  name: string;
  quantityValue: number | string;
  quantityUnit: string;
  priceRs: string;
  mrpRs: string;
  isAvailable: boolean;
}

interface FormCustomizationOption {
  id?: string;
  name: string;
  priceDeltaRs: string;
  isActive: boolean;
}

interface FormCustomizationGroup {
  id?: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  options: FormCustomizationOption[];
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
  const [activeModalTab, setActiveModalTab] = useState<"details" | "variants" | "customizations" | "settings" | "preview">("details");

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
  const [formVariants, setFormVariants] = useState<FormVariant[]>([
    { name: "500g", quantityValue: "500", quantityUnit: "g", priceRs: "", mrpRs: "", isAvailable: true },
    { name: "1 kg", quantityValue: "1000", quantityUnit: "g", priceRs: "", mrpRs: "", isAvailable: true },
  ]);

  // Customization groups state for Create/Edit Modal
  const [formCustomizations, setFormCustomizations] = useState<FormCustomizationGroup[]>([]);

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

  // Tags & Badges
  const [foodType, setFoodType] = useState<FoodType>("NON_VEG");
  const [isHalal, setIsHalal] = useState(true);
  const [badgeText, setBadgeText] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Preview interactive state
  const [previewVariantIndex, setPreviewVariantIndex] = useState(0);
  const [previewCustomizationSelections, setPreviewCustomizationSelections] = useState<Record<number, string[]>>({});

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

  useRealTime({
    channels: ["admin", "catalog"],
    onRefresh: fetchProducts,
  });

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
    const matchingCats = categories.filter((c) => c.department === newDept);
    if (matchingCats.length > 0) {
      setCategoryId(matchingCats[0].id);
    } else {
      setCategoryId("");
    }

    if (newDept === "MEAT") {
      setFoodType("NON_VEG");
      setIsHalal(true);
      setBadgeText("");
      setProductType("WEIGHT");
    } else {
      setFoodType("VEG");
      setIsHalal(false);
      setBadgeText("Daily Essentials at Wholesale Prices");
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
    setIsActive(true);
    setShowNewCatInput(false);

    // Initial variants
    setFormVariants([
      { name: "500g", quantityValue: "500", quantityUnit: "g", priceRs: "140", mrpRs: "160", isAvailable: true },
      { name: "1 kg", quantityValue: "1000", quantityUnit: "g", priceRs: "260", mrpRs: "300", isAvailable: true },
    ]);

    // Initial meat customization templates
    setFormCustomizations([
      {
        name: "Cutting Style",
        selectionType: "SINGLE",
        isRequired: true,
        options: [
          { name: "Curry Cut (Medium)", priceDeltaRs: "0", isActive: true },
          { name: "Biryani Cut (Large Pieces)", priceDeltaRs: "0", isActive: true },
          { name: "Small Pieces (Fry Cut)", priceDeltaRs: "0", isActive: true },
          { name: "Boneless", priceDeltaRs: "30", isActive: true },
        ],
      },
      {
        name: "Cleaning Preference",
        selectionType: "SINGLE",
        isRequired: true,
        options: [
          { name: "Skinless", priceDeltaRs: "0", isActive: true },
          { name: "With Skin", priceDeltaRs: "0", isActive: true },
        ],
      },
    ]);

    setActiveModalTab("details");
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
    setIsActive(prod.isActive);

    // Initialize Form Variants from product.variants
    if (prod.variants && prod.variants.length > 0) {
      setFormVariants(
        prod.variants.map((v) => ({
          id: v.id,
          name: v.name,
          quantityValue: v.quantityValue,
          quantityUnit: v.quantityUnit,
          priceRs: (v.priceMinor / 100).toString(),
          mrpRs: v.mrpMinor ? (v.mrpMinor / 100).toString() : "",
          isAvailable: v.isAvailable,
        }))
      );
    } else {
      setFormVariants([
        { name: "Standard Pack", quantityValue: "1000", quantityUnit: "g", priceRs: sellPrice || "150", mrpRs: mrp, isAvailable: true },
      ]);
    }

    // Initialize Form Customization Groups from product.customizationGroups
    if (prod.customizationGroups && prod.customizationGroups.length > 0) {
      setFormCustomizations(
        prod.customizationGroups.map((g) => ({
          id: g.id,
          name: g.name,
          selectionType: (g.selectionType as "SINGLE" | "MULTIPLE") || "SINGLE",
          isRequired: Boolean(g.isRequired),
          options: (g.options || []).map((o) => ({
            id: o.id,
            name: o.name,
            priceDeltaRs: (o.priceDeltaMinor / 100).toString(),
            isActive: o.isActive !== undefined ? Boolean(o.isActive) : true,
          })),
        }))
      );
    } else {
      setFormCustomizations([]);
    }

    setShowNewCatInput(false);
    setActiveModalTab("details");
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
      "500g": { name: "500g", quantityValue: 500, quantityUnit: "g", defaultPrice: "140" },
      "1kg": { name: "1 kg", quantityValue: 1000, quantityUnit: "g", defaultPrice: "260" },
      "1.5kg": { name: "1.5 kg", quantityValue: 1500, quantityUnit: "g", defaultPrice: "380" },
      "2kg": { name: "2 kg", quantityValue: 2000, quantityUnit: "g", defaultPrice: "500" },
      custom: { name: "", quantityValue: 1000, quantityUnit: "g", defaultPrice: "" },
    };
    const chosen = presetsMap[preset];
    setFormVariants((prev) => [
      ...prev,
      {
        name: chosen.name,
        quantityValue: chosen.quantityValue,
        quantityUnit: chosen.quantityUnit,
        priceRs: chosen.defaultPrice,
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

  // Customization Groups Helpers
  const handleAddPresetCustomization = (type: "cut" | "cleaning" | "custom") => {
    if (type === "cut") {
      setFormCustomizations((prev) => [
        ...prev,
        {
          name: "Cutting Style",
          selectionType: "SINGLE",
          isRequired: true,
          options: [
            { name: "Curry Cut (Medium)", priceDeltaRs: "0", isActive: true },
            { name: "Biryani Cut (Large Pieces)", priceDeltaRs: "0", isActive: true },
            { name: "Small Pieces (Fry Cut)", priceDeltaRs: "0", isActive: true },
            { name: "Boneless", priceDeltaRs: "30", isActive: true },
          ],
        },
      ]);
    } else if (type === "cleaning") {
      setFormCustomizations((prev) => [
        ...prev,
        {
          name: "Cleaning Preference",
          selectionType: "SINGLE",
          isRequired: true,
          options: [
            { name: "Skinless", priceDeltaRs: "0", isActive: true },
            { name: "With Skin", priceDeltaRs: "0", isActive: true },
          ],
        },
      ]);
    } else {
      setFormCustomizations((prev) => [
        ...prev,
        {
          name: "Custom Preference",
          selectionType: "SINGLE",
          isRequired: false,
          options: [
            { name: "Standard", priceDeltaRs: "0", isActive: true },
            { name: "Special Pack", priceDeltaRs: "10", isActive: true },
          ],
        },
      ]);
    }
  };

  const handleRemoveCustomizationGroup = (groupIndex: number) => {
    setFormCustomizations((prev) => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleUpdateCustomizationGroup = (groupIndex: number, field: string, val: any) => {
    setFormCustomizations((prev) =>
      prev.map((g, idx) => (idx === groupIndex ? { ...g, [field]: val } : g))
    );
  };

  const handleAddOptionToGroup = (groupIndex: number) => {
    setFormCustomizations((prev) =>
      prev.map((g, idx) =>
        idx === groupIndex
          ? {
              ...g,
              options: [
                ...g.options,
                { name: "New Option", priceDeltaRs: "0", isActive: true },
              ],
            }
          : g
      )
    );
  };

  const handleRemoveOptionFromGroup = (groupIndex: number, optionIndex: number) => {
    setFormCustomizations((prev) =>
      prev.map((g, idx) =>
        idx === groupIndex
          ? { ...g, options: g.options.filter((_, oIdx) => oIdx !== optionIndex) }
          : g
      )
    );
  };

  const handleUpdateOptionInGroup = (groupIndex: number, optionIndex: number, field: string, val: any) => {
    setFormCustomizations((prev) =>
      prev.map((g, idx) =>
        idx === groupIndex
          ? {
              ...g,
              options: g.options.map((o, oIdx) =>
                oIdx === optionIndex ? { ...o, [field]: val } : o
              ),
            }
          : g
      )
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

  const handleToggleQuickVariant = async (variantId: string, current: boolean) => {
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
      alert("Please provide product name and URL slug");
      setActiveModalTab("details");
      return;
    }

    // Default to first category of department if none selected
    let finalCatId = categoryId;
    if (!finalCatId && filteredCategoriesForDept.length > 0) {
      finalCatId = filteredCategoriesForDept[0].id;
    }

    if (!finalCatId) {
      alert("Please select or create a subcategory");
      setActiveModalTab("details");
      return;
    }

    // Validate variants
    if (formVariants.length === 0) {
      alert("Please add at least one product variant/portion.");
      setActiveModalTab("variants");
      return;
    }

    for (let i = 0; i < formVariants.length; i++) {
      const v = formVariants[i];
      if (!v.name.trim()) {
        alert(`Variant #${i + 1} must have a name (e.g. 500g, 1 kg).`);
        setActiveModalTab("variants");
        return;
      }
      if (!v.priceRs || isNaN(parseFloat(v.priceRs)) || parseFloat(v.priceRs) <= 0) {
        alert(`Variant "${v.name}" must have a valid selling price greater than 0.`);
        setActiveModalTab("variants");
        return;
      }
    }

    // Validate customizations
    for (let i = 0; i < formCustomizations.length; i++) {
      const g = formCustomizations[i];
      if (!g.name.trim()) {
        alert(`Customization group #${i + 1} must have a title.`);
        setActiveModalTab("customizations");
        return;
      }
      if (g.options.length === 0) {
        alert(`Customization group "${g.name}" must have at least one option.`);
        setActiveModalTab("customizations");
        return;
      }
      for (let j = 0; j < g.options.length; j++) {
        if (!g.options[j].name.trim()) {
          alert(`Option #${j + 1} in group "${g.name}" must have a name.`);
          setActiveModalTab("customizations");
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        categoryId: finalCatId,
        description: description.trim() || null,
        productType,
        imageUrl: imageUrl.trim() || null,
        foodType,
        isHalal,
        isAvailable,
        isActive,
        badgeText: badgeText.trim() || (department === "GROCERY" ? "Daily Essentials at Wholesale Prices" : null),
        savePriceText: savePriceText.trim() || null,
        variants: formVariants.map((v) => ({
          id: v.id,
          name: v.name.trim(),
          quantityValue: parseInt(String(v.quantityValue), 10) || 1000,
          quantityUnit: v.quantityUnit || "g",
          priceRs: parseFloat(v.priceRs),
          mrpRs: v.mrpRs && parseFloat(v.mrpRs) > 0 ? parseFloat(v.mrpRs) : null,
          isAvailable: v.isAvailable,
        })),
        customizationGroups: formCustomizations.map((g, gIdx) => ({
          id: g.id,
          name: g.name.trim(),
          selectionType: g.selectionType,
          isRequired: g.isRequired,
          displayOrder: gIdx,
          options: g.options.map((o, oIdx) => ({
            id: o.id,
            name: o.name.trim(),
            priceDeltaRs: o.priceDeltaRs && !isNaN(parseFloat(o.priceDeltaRs)) ? parseFloat(o.priceDeltaRs) : 0,
            isActive: o.isActive,
            displayOrder: oIdx,
          })),
        })),
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        showStatus(editingProduct ? "Product & variants updated successfully!" : "Product created successfully with all variants!");
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
    { label: "🌾 Aashirvaad Whole Wheat Atta", url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80" },
    { label: "🍚 Sona Masoori Rice", url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80" },
  ];

  // Filtered Products for Table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Dept filter
      if (deptFilter !== "ALL") {
        const pDept = p.category?.department;
        if (pDept !== deptFilter) return false;
      }

      // Stock filter
      if (stockFilter === "IN_STOCK" && !p.isAvailable) return false;
      if (stockFilter === "OUT_OF_STOCK" && p.isAvailable) return false;

      // Search
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

  // Calculations for preview
  const previewVariant = formVariants[previewVariantIndex] || formVariants[0];
  const computedSellingRs = previewVariant?.priceRs ? parseFloat(previewVariant.priceRs) : 0;
  const computedMrpRs = previewVariant?.mrpRs ? parseFloat(previewVariant.mrpRs) : 0;
  const computedSavings = computedMrpRs > computedSellingRs ? computedMrpRs - computedSellingRs : 0;
  const liveSaveTag = savePriceText || (computedSavings > 0 ? `Save ₹${computedSavings}` : null);
  const currentCategoryObj = categories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Product Catalog &amp; Multi-Portion Variants</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-800">
            Products &amp; Pricing Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Create products, configure custom weight portions (500g, 1kg, 2kg), and manage cutting &amp; cleaning customization options.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium animate-fade-in flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : "bg-rose-50 border border-rose-300 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Total Products
          </span>
          <p className="text-2xl font-serif font-bold text-stone-800 mt-1">
            {products.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
            🥩 Fresh Meat Cuts
          </span>
          <p className="text-2xl font-serif font-bold text-stone-800 mt-1">
            {products.filter((p) => p.category?.department === "MEAT").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            🛒 Groceries
          </span>
          <p className="text-2xl font-serif font-bold text-stone-800 mt-1">
            {products.filter((p) => p.category?.department === "GROCERY").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Out of Stock
          </span>
          <p className="text-2xl font-serif font-bold text-stone-800 mt-1">
            {products.filter((p) => !p.isAvailable).length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl self-start">
            <button
              onClick={() => setDeptFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                deptFilter === "ALL" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setDeptFilter("MEAT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                deptFilter === "MEAT" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              🥩 Meat ({products.filter((p) => p.category?.department === "MEAT").length})
            </button>
            <button
              onClick={() => setDeptFilter("GROCERY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                deptFilter === "GROCERY" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              🛒 Groceries ({products.filter((p) => p.category?.department === "GROCERY").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search products or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-400" />
            <p>Loading catalog items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 space-y-2">
            <p className="font-semibold text-sm">No products found</p>
            <p className="text-stone-400">Try adjusting your filters or click "Add New Product".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item &amp; Portion Variants</th>
                  <th className="py-3 px-4">Section / Category</th>
                  <th className="py-3 px-4">Tags &amp; Badges</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4 text-center">Stock Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const firstVariant = p.variants?.[0];
                  const priceRs = firstVariant ? (firstVariant.priceMinor / 100).toFixed(0) : "0";
                  const mrpMinor = firstVariant?.mrpMinor ?? p.mrpMinor;
                  const mrpPrice = mrpMinor ? (mrpMinor / 100).toFixed(0) : 0;
                  const isMeat = p.category?.department === "MEAT";

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
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {p.variants?.length || 0} Portions
                              </span>
                              {p.customizationGroups && p.customizationGroups.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {p.customizationGroups.length} Custom Groups
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Section & Category */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isMeat ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isMeat ? "🥩 Meat" : "🛒 Grocery"}
                        </span>
                        <p className="text-xs font-medium text-stone-700 mt-1">
                          {p.category?.name || "General"}
                        </p>
                      </td>

                      {/* Tags & Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <FoodTypeBadge type={p.foodType || (isMeat ? "NON_VEG" : "VEG")} showLabel={true} size="sm" />
                          {isMeat && Boolean(p.isHalal) && (
                            <HalalBadge size="sm" variant="outline" />
                          )}
                          {!isMeat && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                              <span>{p.badgeText || "Daily Essentials"}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4 font-mono">
                        <span className="text-base font-bold text-stone-900 block">
                          ₹{priceRs}
                        </span>
                        {p.variants && p.variants.length > 1 ? (
                          <span className="text-[10px] text-stone-500 font-sans block">
                            {p.variants.map((v) => `${v.name}: ₹${(v.priceMinor / 100).toFixed(0)}`).join(" • ")}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 block font-sans">
                            {firstVariant?.name || "Standard Pack"}
                          </span>
                        )}
                      </td>

                      {/* In-Stock Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStock(p.id)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all shadow-2xs cursor-pointer ${
                            p.isAvailable
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
                            onClick={() => openVariantsModal(p)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition border border-emerald-200"
                            title="Quick Variants Manager"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
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

      {/* QUICK VARIANTS MODAL */}
      <Modal
        isOpen={Boolean(variantModalProduct)}
        onClose={() => setVariantModalProduct(null)}
        title={variantModalProduct ? `Manage Portions: ${variantModalProduct.name}` : "Manage Portions"}
        maxWidth="lg"
      >
        {variantModalProduct && (
          <div className="space-y-6">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
              <div>
                <p className="font-bold text-stone-800">{variantModalProduct.name}</p>
                <p className="text-[11px] text-stone-500">{variantModalProduct.variants.length} portion variants configured in store</p>
              </div>
              <span className="font-mono text-emerald-700 font-bold">
                Live Mulbagal Store
              </span>
            </div>

            {/* Existing Variants Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Active Portions &amp; Weights
              </h4>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white text-xs">
                {variantModalProduct.variants.map((v) => (
                  <div key={v.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <span className="font-bold text-stone-900 block">{v.name}</span>
                      <span className="text-[10px] text-stone-400">
                        {v.quantityValue}{v.quantityUnit} net weight
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-stone-900 text-sm">₹{(v.priceMinor / 100).toFixed(0)}</span>
                      {v.mrpMinor && v.mrpMinor > v.priceMinor && (
                        <span className="text-[10px] text-stone-400 line-through block">
                          ₹{(v.mrpMinor / 100).toFixed(0)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleQuickVariant(v.id, v.isAvailable)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                          v.isAvailable
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-stone-200 text-stone-600 border-stone-300"
                        }`}
                      >
                        {v.isAvailable ? "IN STOCK" : "OUT"}
                      </button>

                      {variantModalProduct.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickVariant(v.id, v.name)}
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

            {/* Add New Variant Form */}
            <form onSubmit={handleAddQuickVariant} className="space-y-3 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Add Another Weight / Pack Size</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Label (e.g. 1.5 kg) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1.5 kg Pack"
                    value={newVariantForm.name}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Weight (Grams) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newVariantForm.quantityValue}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, quantityValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="390"
                    value={newVariantForm.priceRs}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, priceRs: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl focus:outline-none font-mono font-bold text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-stone-600 mb-1">
                    MRP (₹ Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="450"
                    value={newVariantForm.mrpRs}
                    onChange={(e) => setNewVariantForm({ ...newVariantForm, mrpRs: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isAddingVariant}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                >
                  Save New Portion
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* CREATE / EDIT PRODUCT TABBED MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : "Create New Product"}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-5">
          {/* Section 8: 5-Tab Navigation */}
          <div className="flex items-center gap-1.5 border-b border-stone-200 pb-3 overflow-x-auto scrollbar-none">
            {[
              { id: "details", label: "1. Product Details" },
              { id: "variants", label: `2. Portions & Variants (${formVariants.length})` },
              { id: "customizations", label: `3. Customizations (${formCustomizations.length})` },
              { id: "settings", label: "4. Availability & Badges" },
              { id: "preview", label: "5. Customer Preview" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveModalTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeModalTab === tab.id
                    ? "bg-stone-900 text-white shadow-xs"
                    : "bg-stone-100 hover:bg-stone-200 text-stone-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: PRODUCT DETAILS */}
          {activeModalTab === "details" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                  Department / Business Section *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleDepartmentChange("MEAT")}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                      department === "MEAT"
                        ? "border-rose-600 bg-rose-50/70 text-rose-950 shadow-xs ring-1 ring-rose-500/30"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <span className="text-2xl">🥩</span>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm">Meat &amp; Poultry</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Fresh Chicken, Masala Special Cuts, Fish, Seafood, Farm &amp; Desi Eggs
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDepartmentChange("GROCERY")}
                    className={`p-3 rounded-2xl border-2 text-left transition flex items-start gap-3 cursor-pointer ${
                      department === "GROCERY"
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-500/30"
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                    }`}
                  >
                    <span className="text-2xl">🛒</span>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm">Daily Groceries</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Milk, Ghee, Atta, Rice, Spices, Veggies &amp; Daily Essentials
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subcategory */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                    Subcategory / Hub Section *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatInput(!showNewCatInput)}
                    className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
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
                      Save
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

              {/* Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={department === "MEAT" ? "e.g. Fresh Tender Chicken" : "e.g. Fresh Farm Desi Eggs"}
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

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Product Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Freshness guarantees, farm source, preparation details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                />
              </div>

              {/* Image URL & Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  Product Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Quick Images:</span>
                  {(department === "MEAT" ? meatPhotoPresets : groceryPhotoPresets).map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTIONS & VARIANTS */}
          {activeModalTab === "variants" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Configured Pack Sizes &amp; Portions
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Customers can see and choose between these portions on the storefront and product page.
                  </p>
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Add Portion:</span>
                  <button
                    type="button"
                    onClick={() => handleAddPresetVariant("500g")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + 500g
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetVariant("1kg")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + 1 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetVariant("1.5kg")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + 1.5 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetVariant("2kg")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + 2 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetVariant("custom")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition cursor-pointer"
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
                    className="p-3 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-xs"
                  >
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-6 gap-2 w-full text-xs">
                      {/* Name */}
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                          Portion / Pack Label *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 500g, 1 kg Pack"
                          value={v.name}
                          onChange={(e) => handleUpdateFormVariant(idx, "name", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-semibold focus:outline-none"
                        />
                      </div>

                      {/* Weight Value */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                          Quantity Value *
                        </label>
                        <input
                          type="number"
                          required
                          value={v.quantityValue}
                          onChange={(e) => handleUpdateFormVariant(idx, "quantityValue", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-mono focus:outline-none"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                          Unit *
                        </label>
                        <select
                          value={v.quantityUnit}
                          onChange={(e) => handleUpdateFormVariant(idx, "quantityUnit", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
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
                          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* MRP */}
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-500 mb-0.5">
                          MRP (₹ Optional)
                        </label>
                        <input
                          type="number"
                          step="1"
                          placeholder="₹"
                          value={v.mrpRs}
                          onChange={(e) => handleUpdateFormVariant(idx, "mrpRs", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-500 font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Stock toggle and delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateFormVariant(idx, "isAvailable", !v.isAvailable)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
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
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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
          )}

          {/* TAB 3: CUSTOMIZATIONS */}
          {activeModalTab === "customizations" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Product Customizations &amp; Preferences
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Configure cutting preferences, skin removal, cleaning styles, or add-ons with optional extra charges.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Quick Groups:</span>
                  <button
                    type="button"
                    onClick={() => handleAddPresetCustomization("cut")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + Cutting Style
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetCustomization("cleaning")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 transition cursor-pointer"
                  >
                    + Cleaning / Skin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetCustomization("custom")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition cursor-pointer"
                  >
                    + Custom Group
                  </button>
                </div>
              </div>

              {formCustomizations.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 bg-stone-50/50 rounded-2xl border border-dashed border-stone-300 space-y-2">
                  <p className="font-semibold text-stone-700">No Customizations Configured</p>
                  <p className="text-stone-400 max-w-sm mx-auto">
                    This product currently has standard preparation with no choices. Click "+ Cutting Style" or "+ Custom Group" above to add customer options.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formCustomizations.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 shadow-xs"
                    >
                      {/* Group Header Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            required
                            placeholder="Group Title (e.g. Cutting Style)"
                            value={group.name}
                            onChange={(e) => handleUpdateCustomizationGroup(gIdx, "name", e.target.value)}
                            className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-bold flex-1 max-w-xs focus:outline-none"
                          />

                          <select
                            value={group.selectionType}
                            onChange={(e) => handleUpdateCustomizationGroup(gIdx, "selectionType", e.target.value)}
                            className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-none"
                          >
                            <option value="SINGLE">Single Choice (Radio)</option>
                            <option value="MULTIPLE">Multiple Choice (Checkboxes)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-stone-700 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={group.isRequired}
                              onChange={(e) => handleUpdateCustomizationGroup(gIdx, "isRequired", e.target.checked)}
                              className="w-3.5 h-3.5 text-stone-900 rounded focus:ring-0"
                            />
                            <span>Required for customer</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveCustomizationGroup(gIdx)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Remove Group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Options in this Group
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddOptionToGroup(gIdx)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  required
                                  placeholder="Option name"
                                  value={opt.name}
                                  onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, "name", e.target.value)}
                                  className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800 flex-1 focus:outline-none"
                                />

                                <div className="flex items-center gap-1 w-24">
                                  <span className="text-[10px] font-bold text-stone-400">+₹</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={opt.priceDeltaRs}
                                    onChange={(e) => handleUpdateOptionInGroup(gIdx, oIdx, "priceDeltaRs", e.target.value)}
                                    className="w-full px-1.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-mono font-semibold text-stone-800 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveOptionFromGroup(gIdx, oIdx)}
                                className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                title="Remove Option"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AVAILABILITY & SETTINGS */}
          {activeModalTab === "settings" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Availability Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">In Stock for Ordering</h5>
                    <p className="text-[10px] text-stone-500">Customer can add this product to cart right now</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>

                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-stone-800">Published in Storefront</h5>
                    <p className="text-[10px] text-stone-500">Visible on the public menu and catalog</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Food Type Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1.5">
                  Food Classification *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFoodType("NON_VEG")}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition cursor-pointer ${
                      foodType === "NON_VEG"
                        ? "border-rose-600 bg-rose-50 text-rose-800 font-bold shadow-xs ring-1 ring-rose-500/30"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <FoodTypeBadge type="NON_VEG" showLabel={false} size="sm" />
                    <span className="text-xs">Non-Veg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFoodType("VEG")}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition cursor-pointer ${
                      foodType === "VEG"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs ring-1 ring-emerald-500/30"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <FoodTypeBadge type="VEG" showLabel={false} size="sm" />
                    <span className="text-xs">Pure Veg</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFoodType("EGG")}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition cursor-pointer ${
                      foodType === "EGG"
                        ? "border-amber-500 bg-amber-50 text-amber-800 font-bold shadow-xs ring-1 ring-amber-500/30"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <FoodTypeBadge type="EGG" showLabel={false} size="sm" />
                    <span className="text-xs">Contains Egg</span>
                  </button>
                </div>
              </div>

              {/* Halal Certified Tag */}
              {department === "MEAT" && (
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <HalalBadge size="sm" variant="outline" />
                    <div>
                      <h5 className="text-xs font-bold text-stone-800">100% Halal Certified Tag</h5>
                      <p className="text-[10px] text-stone-500">
                        Display authentic green Halal badge on product card and detail page
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isHalal}
                    onChange={(e) => setIsHalal(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              )}

              {/* Badge Text & Custom Save Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Store Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Essentials at Wholesale Prices"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Custom Save Tag Override (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Save ₹45"
                    value={savePriceText}
                    onChange={(e) => setSavePriceText(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER PREVIEW */}
          {activeModalTab === "preview" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600">
                <span className="font-bold text-stone-800 block">Interactive Customer Experience Preview</span>
                <span className="text-[11px] text-stone-500">
                  This preview renders exactly what your customers will see on the Homemart4u storefront and product detail screens.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Storefront Card Preview */}
                <div className="md:col-span-5 flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                    Storefront Card
                  </span>
                  <div className="w-full max-w-[260px] bg-white rounded-2xl border border-stone-200 shadow-sm p-3.5 flex flex-col justify-between">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-stone-50 mb-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl || "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-white/95 p-1 rounded-md shadow-xs">
                        <FoodTypeBadge type={foodType} showLabel={false} size="sm" />
                      </div>
                      {liveSaveTag && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow">
                            {liveSaveTag}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-stone-900 line-clamp-1">
                        {name || "Product Name Here"}
                      </h4>
                      {department === "MEAT" && isHalal && (
                        <HalalBadge size="sm" variant="outline" />
                      )}
                    </div>

                    {/* Portion chips on card */}
                    {formVariants.length > 1 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2">
                        {formVariants.map((v, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                              previewVariantIndex === idx
                                ? "bg-stone-900 text-white border-stone-900"
                                : "bg-stone-50 text-stone-700 border-stone-200"
                            }`}
                          >
                            {v.name} ₹{v.priceRs || 0}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-stone-100 mt-2 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-stone-900">
                        ₹{computedSellingRs || 0}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-[11px] font-bold">
                        ADD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Detail Quantity & Customization Selector Preview */}
                <div className="md:col-span-7 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-4 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Product Detail Page Controls
                  </span>

                  {/* Choose your quantity */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                      Choose your quantity
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {formVariants.map((v, idx) => {
                        const isSelected = previewVariantIndex === idx;
                        const vPrice = v.priceRs ? parseFloat(v.priceRs) : 0;
                        const vMrp = v.mrpRs ? parseFloat(v.mrpRs) : 0;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewVariantIndex(idx)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              isSelected
                                ? "border-stone-900 bg-stone-900 text-white shadow-xs ring-1 ring-stone-900"
                                : "border-stone-200 bg-stone-50 text-stone-700"
                            }`}
                          >
                            <span className="font-bold text-xs block">{v.name || `Portion ${idx + 1}`}</span>
                            <span className={`font-mono text-sm font-bold ${isSelected ? "text-amber-300" : "text-stone-900"}`}>
                              ₹{vPrice}
                            </span>
                            {vMrp > vPrice && (
                              <span className={`text-[10px] line-through ml-1.5 ${isSelected ? "text-stone-400" : "text-stone-400"}`}>
                                ₹{vMrp}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customizations in Preview */}
                  {formCustomizations.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-stone-100">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                        Customer Preferences
                      </label>
                      {formCustomizations.map((g, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-700 text-[11px]">{g.name}</span>
                            {g.isRequired && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {g.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-stone-50 border border-stone-200 text-stone-800 flex items-center gap-1"
                              >
                                <span>{opt.name}</span>
                                {parseFloat(opt.priceDeltaRs || "0") > 0 && (
                                  <span className="text-emerald-700 font-bold">+₹{opt.priceDeltaRs}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Estimated Item Total */}
                  <div className="p-3 bg-stone-100/70 rounded-xl flex items-center justify-between font-bold text-xs">
                    <span>Estimated Customer Total</span>
                    <span className="font-mono text-sm text-stone-900">₹{computedSellingRs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeModalTab !== "details" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tabs: Array<"details" | "variants" | "customizations" | "settings" | "preview"> = [
                      "details",
                      "variants",
                      "customizations",
                      "settings",
                      "preview",
                    ];
                    const prevIdx = Math.max(0, tabs.indexOf(activeModalTab) - 1);
                    setActiveModalTab(tabs[prevIdx]);
                  }}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
              )}

              {activeModalTab !== "preview" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tabs: Array<"details" | "variants" | "customizations" | "settings" | "preview"> = [
                      "details",
                      "variants",
                      "customizations",
                      "settings",
                      "preview",
                    ];
                    const nextIdx = Math.min(tabs.length - 1, tabs.indexOf(activeModalTab) + 1);
                    setActiveModalTab(tabs[nextIdx]);
                  }}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                className="bg-stone-900 hover:bg-stone-800 text-white px-6 font-semibold shadow-sm"
              >
                {editingProduct ? "Update Product" : "Save Product to Catalog"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
