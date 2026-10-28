import React from "react";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";
import { MenuClient } from "./MenuClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fresh Meat & Daily Groceries Menu | homemart4u Mulbagal",
  description: "Browse farm fresh tender chicken, curry cuts, biryani cuts, and daily grocery essentials (milk, atta, rice, oils, masalas). Express delivery in 20 minutes in Mulbagal.",
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
        <span className="text-xs uppercase font-semibold text-amberGold-600 tracking-wider">
          homemart4u Express Store &bull; Srinivaspur Road, Mulbagal
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-medium text-charcoal-700 mt-1">
          Store Catalog &amp; Menu
        </h1>
        <p className="text-xs text-charcoal-500 mt-1 max-w-xl">
          Swipe left/right or tap below to seamlessly switch between our Daily Groceries and Fresh Meat cuts.
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
