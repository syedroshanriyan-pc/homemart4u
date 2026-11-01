"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { OrderStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ShoppingBag, ArrowRight, RotateCcw, FileText, Clock } from "lucide-react";

export default function OrderHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/account/orders");
      return;
    }
    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, router]);

  const handleReorder = async (orderId: string) => {
    setReorderingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/reorder`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.items) {
        // Add items to cart with CURRENT prices
        data.items.forEach((item: any) => {
          addItem({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            unitPriceMinor: item.currentUnitPriceMinor,
            quantity: item.quantity,
            customizations: item.customizations,
          });
        });
        router.push("/cart");
      } else {
        alert(data.error || "Some items are currently unavailable for reorder.");
      }
    } catch {
      alert("Failed to reorder. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-charcoal-500">
        Loading your order history...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
            My Orders
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Track active deliveries and review previous fresh purchases.
          </p>
        </div>
        <Link href="/menu" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-semibold text-xs transition">Browse Menu</Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-cream-200 text-charcoal-500 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-base font-semibold text-charcoal-700">
            No orders placed yet
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            You haven&apos;t placed any fresh meat orders yet. Order now to experience tender artisanal cuts delivered in ~20 minutes.
          </p>
          <div className="pt-2">
            <Link href="/menu" className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-xs shadow-sm transition">Order Fresh Chicken</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const placedDate = new Date(order.placedAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={order.id}
                className="bg-cream-50 rounded-2xl border border-cream-200 p-5 sm:p-6 shadow-subtle hover:border-cream-300 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-200 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-charcoal-800">
                      #{order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-[11px] text-charcoal-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {placedDate}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="space-y-1.5 text-xs text-charcoal-600">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.productNameSnapshot} ({item.variantNameSnapshot})
                      </span>
                      <span className="font-mono font-medium text-charcoal-700 flex-shrink-0">
                        ₹{(item.lineTotalMinor / 100).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer with Actions */}
                <div className="pt-3 border-t border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-charcoal-500">Order Total: </span>
                    <span className="font-serif font-bold text-sm text-charcoal-800 font-mono">
                      ₹{(order.totalMinor / 100).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-charcoal-400 ml-2">
                      ({order.payment?.method || "COD"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/account/orders/${order.id}?invoice=true`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-cream-300 bg-white hover:bg-cream-100 text-charcoal-700 font-medium text-xs transition shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1 text-charcoal-500" />
                      <span>Invoice</span>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(order.id)}
                      isLoading={reorderingId === order.id}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      <span>Reorder at Current Rate</span>
                    </Button>

                    <Link href={`/account/orders/${order.id}`} className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-charcoal-900 font-bold text-xs shadow-sm transition"><span>Track / Details</span><ArrowRight className="w-3 h-3 ml-1" /></Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
