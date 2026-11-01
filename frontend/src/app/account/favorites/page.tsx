"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ProductCard, ProductData } from "@/components/catalog/ProductCard";
import { Button } from "@/components/ui/Button";
import { Heart } from "lucide-react";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch("/api/me/favorites")
        .then((res) => res.json())
        .then((d) => setFavorites(d.favorites || []))
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-charcoal-500">
        Loading your favorites...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
            Favorite Cuts & Products
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Your saved items for quick one-click reordering.
          </p>
        </div>
        <Link href="/menu" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-xs transition">Browse Full Menu</Link>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center space-y-3">
          <Heart className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            No favorite items saved
          </h3>
          <p className="text-xs text-charcoal-500">
            Tap the heart icon on any product in our menu to save it here for fast reordering.
          </p>
          <div className="pt-2">
            <Link href="/menu" className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-xs shadow-sm transition">Explore Menu</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} isFavoriteInitial={true} />
          ))}
        </div>
      )}
    </div>
  );
}
