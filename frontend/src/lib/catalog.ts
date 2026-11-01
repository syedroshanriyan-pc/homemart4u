import { apiClient } from "./api-client";

export async function getActiveCategories(): Promise<any[]> {
  try {
    const data = await apiClient.get<{ categories: any[] }>("/api/categories", {
      cache: "no-store",
    } as any);
    return data.categories || [];
  } catch (err) {
    console.warn("Unable to fetch categories from backend API:", err);
    return [];
  }
}

export async function getActiveProducts(categorySlug?: string): Promise<any[]> {
  try {
    const params: Record<string, string> = { available: "true" };
    if (categorySlug) params.category = categorySlug;

    const data = await apiClient.get<{ products: any[] }>("/api/products", {
      params,
      cache: "no-store",
    } as any);
    return data.products || [];
  } catch (err) {
    console.warn("Unable to fetch products from backend API:", err);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<any | null> {
  try {
    const data = await apiClient.get<{ product: any }>(`/api/products/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    } as any);
    return data.product || null;
  } catch (err) {
    console.warn(`Unable to fetch product [${slug}] from backend API:`, err);
    return null;
  }
}

export async function getActiveCoupons(): Promise<any[]> {
  try {
    const data = await apiClient.get<{ coupons: any[] }>("/api/coupons", {
      cache: "no-store",
    } as any);
    return data.coupons || [];
  } catch (err) {
    console.warn("Unable to fetch coupons from backend API:", err);
    return [];
  }
}
