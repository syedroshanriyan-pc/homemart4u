"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function UserReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch("/api/me/reviews")
        .then((res) => res.json())
        .then((d) => setReviews(d.reviews || []))
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-charcoal-500">
        Loading your reviews...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
          My Ratings & Reviews
        </h1>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Feedback submitted for your completed deliveries in Mulbagal.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center space-y-3">
          <Star className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            No reviews submitted yet
          </h3>
          <p className="text-xs text-charcoal-500">
            Once an order is delivered, you can rate the freshness, portioning, and delivery speed.
          </p>
          <div className="pt-2">
            <Link href="/account/orders" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-xs transition">View Past Orders</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-cream-50 p-5 rounded-2xl border border-cream-200 shadow-subtle space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amberGold-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < r.rating ? "fill-current" : "text-cream-300"}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-charcoal-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>

              {r.comment && (
                <p className="text-xs text-charcoal-700 leading-relaxed font-serif italic">
                  &ldquo;{r.comment}&rdquo;
                </p>
              )}

              <div className="pt-3 border-t border-cream-200 flex items-center justify-between text-xs text-charcoal-500">
                <Link
                  href={`/account/orders/${r.orderId}`}
                  className="font-mono text-amberGold-600 font-bold hover:underline"
                >
                  Order #{r.order?.orderNumber}
                </Link>
                <span>Status: {r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
