import React from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { ProductDetailClient } from "./ProductDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product | homemart4u" };

  const minPrice = product.variants?.[0]?.priceMinor ? product.variants[0].priceMinor / 100 : 0;

  return {
    title: `${product.name} | homemart4u Mulbagal`,
    description:
      product.description ||
      `Order ${product.name} online in Mulbagal starting at ₹${minPrice}. Fast ~20-minute delivery from Srinivaspur Road.`,
    openGraph: {
      title: `${product.name} | homemart4u Mulbagal`,
      description: product.description || `Order ${product.name} in Mulbagal.`,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || !product.isActive) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <ProductDetailClient product={product} />
    </div>
  );
}
