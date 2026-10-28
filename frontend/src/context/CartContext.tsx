"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext";

export interface CartCustomization {
  group: string;
  option: string;
  optionId?: string;
  priceDeltaMinor?: number;
}

export interface CartItem {
  id: string; // Unique key: variantId + customizations
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  imageUrl?: string;
  unitPriceMinor: number;
  quantity: number;
  weightGrams?: number | null;
  isQualifyingMeat?: boolean;
  customizations?: CartCustomization[];
}

export interface ValidationSummary {
  isValid: boolean;
  subtotalMinor: number;
  discountMinor: number;
  deliveryDistanceMeters: number;
  deliveryFeeMinor: number;
  codFeeMinor: number;
  totalMinor: number;
  qualifyingMeatGrams: number;
  isMinMeatMet: boolean;
  meatShortfallGrams: number;
  coupon: any;
  errors: string[];
}

export interface CartPreviewCalculation {
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  codFeeMinor: number;
  totalMinor: number;
  itemCount: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  couponCode: string;
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  validation: ValidationSummary | null;
  previewCalculation: CartPreviewCalculation;
  isValidating: boolean;
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  revalidate: (signal?: AbortSignal) => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [],
  itemCount: 0,
  couponCode: "",
  paymentMethod: "COD",
  setPaymentMethod: () => {},
  validation: null,
  previewCalculation: {
    subtotalMinor: 0,
    discountMinor: 0,
    deliveryFeeMinor: 0,
    codFeeMinor: 0,
    totalMinor: 0,
    itemCount: 0,
  },
  isValidating: false,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  applyCoupon: async () => false,
  removeCoupon: () => {},
  revalidate: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedAddress } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("COD");
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fc_cart_v1");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem("fc_cart_v1", JSON.stringify(items));
    } catch {}
  }, [items]);

  const generateItemId = (variantId: string, customizations?: CartCustomization[]) => {
    if (!customizations || customizations.length === 0) return variantId;
    const sorted = [...customizations].sort((a, b) => a.option.localeCompare(b.option));
    return `${variantId}_${sorted.map((c) => c.option).join("_")}`;
  };

  const addItem = (itemInput: Omit<CartItem, "id">) => {
    const id = generateItemId(itemInput.variantId, itemInput.customizations);
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + itemInput.quantity } : i
        );
      }
      return [...prev, { ...itemInput, id }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode("");
    setValidation(null);
  };

  const applyCoupon = async (code: string): Promise<boolean> => {
    setCouponCode(code.trim().toUpperCase());
    return true;
  };

  const removeCoupon = () => {
    setCouponCode("");
  };

  // Immediate, memoized client-side preview calculation (sub-millisecond responsiveness)
  const previewCalculation: CartPreviewCalculation = useMemo(() => {
    let subtotalMinor = 0;
    let itemCount = 0;

    for (const item of items) {
      const customizationDelta = (item.customizations || []).reduce(
        (sum, c) => sum + (c.priceDeltaMinor || 0),
        0
      );
      const unitPriceMinor = item.unitPriceMinor + customizationDelta;
      subtotalMinor += unitPriceMinor * item.quantity;
      itemCount += item.quantity;
    }

    // COD surcharge is ₹7.00 (700 paise)
    const codFeeMinor = paymentMethod === "COD" && items.length > 0 ? 700 : 0;
    const deliveryFeeMinor = validation?.deliveryFeeMinor ?? 0;
    const discountMinor = validation?.discountMinor ?? 0;
    const totalMinor = Math.max(0, subtotalMinor - discountMinor + deliveryFeeMinor + codFeeMinor);

    return {
      subtotalMinor,
      discountMinor,
      deliveryFeeMinor,
      codFeeMinor,
      totalMinor,
      itemCount,
    };
  }, [items, paymentMethod, validation?.deliveryFeeMinor, validation?.discountMinor]);

  // Server-side authoritative cart revalidation with race condition prevention
  const revalidate = async (signal?: AbortSignal) => {
    if (items.length === 0) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          customizations: i.customizations,
        })),
        addressId: selectedAddress?.id,
        coordinates: selectedAddress
          ? { lat: selectedAddress.latitude, lng: selectedAddress.longitude }
          : undefined,
        couponCode,
        paymentMethod,
      };

      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      });

      if (res.ok) {
        const data = await res.json();
        setValidation(data);
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Cart validation error:", err);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Debounced server-side validation to avoid excessive fetches and prevent calculation races
  useEffect(() => {
    if (items.length === 0) {
      setValidation(null);
      return;
    }

    // Cancel any ongoing fetch to prevent out-of-order responses
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      revalidate(controller.signal);
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, selectedAddress?.id, couponCode, paymentMethod]);

  const itemCount = previewCalculation.itemCount;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        couponCode,
        paymentMethod,
        setPaymentMethod,
        validation,
        previewCalculation,
        isValidating,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        revalidate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
