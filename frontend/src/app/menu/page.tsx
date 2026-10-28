import React from "react";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";
import { MenuClient } from "./MenuClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fresh Chicken, Farm & Desi Eggs Menu | homemart4u Mulbagal",
  description: "Browse farm fresh tender chicken, customizable curry cuts, biryani cuts, and farm-fresh desi eggs. Express 20-minute delivery in Mulbagal.",
};

export default async function MenuPage() {
  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [fetchedCategories, fetchedProducts] = await Promise.all([
      getActiveCategories(),
      getActiveProducts(),
    ]);
    categories = fetchedCategories || [];
    products = fetchedProducts || [];
  } catch (err) {
    console.error("MenuPage SSR fallback error:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6">
        <span className="text-xs uppercase font-semibold text-rose-600 tracking-wider">
          homemart4u Fresh Hub &bull; Srinivaspur Road, Mulbagal
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
          Fresh Chicken &amp; Egg Catalog
        </h1>
        <p className="text-xs text-stone-600 mt-1 max-w-xl">
          Order 100% Halal fresh chicken with customized skin and cut preferences, plus pure desi and daily farm table eggs.
        </p>
      </div>

      <React.Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Loading catalog...</div>}>
        <MenuClient
          initialCategories={categories}
          initialProducts={products}
        />
      </React.Suspense>
    </div>
  );
}
