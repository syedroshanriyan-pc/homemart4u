"use client";

import React, { useState } from "react";
import { useAuth, UserAddress } from "@/context/AuthContext";
import { LocationModal } from "@/components/ui/LocationModal";
import { Button } from "@/components/ui/Button";
import { MapPin, Plus, Trash2, Home, Briefcase, Check } from "lucide-react";

export default function AddressesPage() {
  const { user, loading: authLoading, selectedAddress, setSelectedAddress, refreshUser } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setDeletingId(id);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
      const res = await fetch(`/api/me/addresses/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        await refreshUser();
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-xs text-charcoal-500">
        Loading saved addresses...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-charcoal-700">
            Saved Delivery Addresses
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Manage your delivery locations across Mulbagal city.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span>Add New Address</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {user?.addresses && user.addresses.length > 0 ? (
          user.addresses.map((addr) => {
            const isSelected = selectedAddress?.id === addr.id;
            return (
              <div
                key={addr.id}
                className={`bg-cream-50 rounded-2xl border p-5 shadow-subtle flex flex-col justify-between space-y-3 transition-all ${
                  isSelected
                    ? "border-amberGold-400 ring-1 ring-amberGold-400/50 bg-amberGold-50/20"
                    : "border-cream-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-cream-100 text-charcoal-600">
                      {addr.label === "Work" ? (
                        <Briefcase className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-semibold text-xs text-charcoal-800">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cream-200 text-charcoal-600">
                        Default
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    disabled={deletingId === addr.id}
                    className="text-charcoal-400 hover:text-red-600 transition-colors p-1"
                    title="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <p className="text-xs text-charcoal-700 font-medium leading-relaxed">
                    {addr.addressLine}
                  </p>
                  <p className="text-[11px] text-charcoal-400 mt-0.5">
                    {addr.locality}, {addr.city} - {addr.postalCode || "563131"}
                  </p>
                </div>

                <div className="pt-2 border-t border-cream-200 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedAddress(addr)}
                    className="text-xs font-semibold text-amberGold-600 hover:underline flex items-center gap-1"
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Active for Ordering</span>
                      </>
                    ) : (
                      <span>Set as Active</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="sm:col-span-2 bg-cream-50 rounded-2xl border border-cream-200 p-8 text-center space-y-3">
            <MapPin className="w-8 h-8 text-charcoal-400 mx-auto" />
            <h3 className="font-serif text-sm font-semibold text-charcoal-700">
              No saved addresses yet
            </h3>
            <p className="text-xs text-charcoal-500">
              Add your Mulbagal home or work address for 1-tap checkout.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Delivery Address
            </Button>
          </div>
        )}
      </div>

      <LocationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
