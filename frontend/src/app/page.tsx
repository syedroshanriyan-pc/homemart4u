import React from "react";
import { getActiveCategories, getActiveProducts } from "@/lib/catalog";
import { HomePageClientController } from "@/components/home/HomePageClientController";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getActiveCategories(),
    getActiveProducts(),
  ]);

  return (
    <HomePageClientController
      products={products}
      categories={categories}
    />
  );
}
