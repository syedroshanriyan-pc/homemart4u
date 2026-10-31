"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  ShoppingBag,
  MapPin,
  Heart,
  Star,
  Shield,
  Bike,
  LogOut,
  User,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function AccountPage() {
  const { user, loading, logout, deleteAccount } = useAuth();
  const router = useRouter();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteAccount();
    setIsDeleting(false);
    if (res.success) {
      setIsDeleteModalOpen(false);
      router.push("/login?deleted=true");
    } else {
      setDeleteError(res.error || "Failed to delete account. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-charcoal-500">
        Loading account profile...
      </div>
    );
  }

  if (!user) {
    router.push("/login?redirect=/account");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Profile Header */}
      <div className="bg-cream-50 rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-charcoal-500 text-cream-50 flex items-center justify-center font-serif text-xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal-700">
              {user.name}
            </h1>
            <p className="text-xs text-charcoal-500 mt-0.5">
              {user.mobile} {user.email ? `&bull; ${user.email}` : ""}
            </p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cream-200 text-charcoal-600">
              {user.role}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="self-start sm:self-center text-red-600 hover:bg-red-50 hover:border-red-200"
        >
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Surface Shortcuts if staff role */}
      {(user.role === "ADMIN") && (
        <div className="p-4 rounded-2xl bg-amberGold-50 border border-amberGold-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amberGold-400 text-charcoal-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal-700">
                Store Operations Admin Panel
              </h3>
              <p className="text-xs text-charcoal-500">
                Manage orders, products, daily pricing, delivery workers, coupons, and metrics.
              </p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="accent" size="sm">
              Open Admin &rarr;
            </Button>
          </Link>
        </div>
      )}

      {user.role === "DELIVERY_AGENT" && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-cream-50">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal-700">
                Delivery Partner Portal
              </h3>
              <p className="text-xs text-charcoal-500">
                View your assigned orders, customer GPS locations, and mark deliveries.
              </p>
            </div>
          </div>
          <Link href="/delivery">
            <Button variant="primary" size="sm">
              Open Portal &rarr;
            </Button>
          </Link>
        </div>
      )}

      {/* Account Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/account/orders"
          className="p-5 rounded-2xl bg-cream-50 border border-cream-200 hover:border-amberGold-300 shadow-subtle hover:shadow-card transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cream-100 text-charcoal-700 group-hover:bg-amberGold-50 group-hover:text-amberGold-600 transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                Order History & Tracking
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Track active orders, reorder previous cuts, view invoices
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/account/addresses"
          className="p-5 rounded-2xl bg-cream-50 border border-cream-200 hover:border-amberGold-300 shadow-subtle hover:shadow-card transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cream-100 text-charcoal-700 group-hover:bg-amberGold-50 group-hover:text-amberGold-600 transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                Saved Delivery Addresses
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Manage Home, Work, and other Mulbagal locations
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/account/favorites"
          className="p-5 rounded-2xl bg-cream-50 border border-cream-200 hover:border-amberGold-300 shadow-subtle hover:shadow-card transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cream-100 text-charcoal-700 group-hover:bg-amberGold-50 group-hover:text-amberGold-600 transition-colors">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                Favorite Products
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Quickly reorder your bookmarked cuts
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/account/reviews"
          className="p-5 rounded-2xl bg-cream-50 border border-cream-200 hover:border-amberGold-300 shadow-subtle hover:shadow-card transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cream-100 text-charcoal-700 group-hover:bg-amberGold-50 group-hover:text-amberGold-600 transition-colors">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-semibold text-charcoal-700">
                My Reviews & Ratings
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Feedback provided for your delivered orders
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-charcoal-400 group-hover:text-charcoal-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Account Privacy & Deletion (Danger Zone) */}
      <div className="rounded-3xl border border-red-200 bg-red-50/40 p-6 sm:p-7 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-red-950 flex items-center gap-2">
                Delete Account &amp; Personal Data
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-200/70 text-red-800 font-semibold tracking-wider">
                  Permanent
                </span>
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                Permanently erase your account, login credentials, saved delivery addresses, order records, and all data from our database. This action is irreversible.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDeleteError("");
              setIsDeleteModalOpen(true);
            }}
            className="self-start sm:self-center border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all font-semibold shrink-0"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Delete Account</span>
          </Button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Account Permanently?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Warning: This action cannot be undone</span>
            </div>
            <p>
              You are about to permanently delete your account (<strong>{user.mobile}</strong>). All your records will be immediately erased from everywhere including the database:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-red-700 text-[11px]">
              <li>Profile information and credentials</li>
              <li>Saved delivery addresses and GPS coordinates</li>
              <li>Order history, line items, and payment receipts</li>
              <li>Reviews and favorites</li>
            </ul>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-xs text-red-800">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteAccount}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Yes, Delete Account Permanently</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
