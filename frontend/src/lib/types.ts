export type UserRole =
  | "CUSTOMER"
  | "ADMIN"
  | "DELIVERY_AGENT"
  | "ORDER_MANAGER";

export interface SessionUser {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
}

export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentMethod = "COD" | "UPI" | "GPAY" | "PHONEPE" | "PAYTM";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface CartCustomizationItem {
  optionId: string;
  name: string;
  priceDeltaMinor: number;
}

export interface CartItemInput {
  productId: string;
  variantId: string;
  quantity: number;
  customizations?: CartCustomizationItem[];
}

export interface OrderCalculationResult {
  isValid: boolean;
  subtotalMinor: number;
  qualifyingMeatGrams: number;
  isMinMeatMet: boolean;
  deliveryDistanceMeters: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  codFeeMinor: number;
  totalMinor: number;
  errors: string[];
}
