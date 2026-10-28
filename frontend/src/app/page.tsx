import React from "react";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";
import { HomePageClientController } from "@/components/home/HomePageClientController";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const [categories, products] = await Promise.all([
      getActiveCategories(),
      getActiveProducts(),
    ]);

    return (
      <HomePageClientController
        products={products || []}
        categories={categories || []}
      />
    );
  } catch (err) {
    console.error("HomePage SSR fallback error:", err);
    return (
      <HomePageClientController
        products={[]}
        categories={[]}
      />
    );
  }
}
