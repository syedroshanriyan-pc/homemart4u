"use client";

import React, { useState, useEffect } from "react";
import {
  Bike,
  Plus,
  RefreshCw,
  AlertCircle,
  Phone,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Power,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface Agent {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  status: string;
  createdAt: string;
  deliveryProfile: {
    id?: string;
    availabilityStatus?: string;
    isAvailable?: boolean;
    vehicleType?: string | null;
    vehicleNumber?: string | null;
  } | null;
  assignedDeliveries: {
    status: string;
    order: {
      id: string;
      orderNumber: string;
      totalMinor: number;
      status: string;
    };
  }[];
}

export default function AdminDeliveryAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add Form State
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
  });

  // Edit Form State
  const [editingAgent, setEditingAgent] = useState<{
    id: string;
    name: string;
    mobile: string;
    email: string;
    password: "";
    status: string;
    availabilityStatus: string;
  } | null>(null);

  // Delete Target Agent
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  const adminFetch = (url: string, options: RequestInit = {}) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("fc_token") : null;
    return fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminFetch("/api/admin/delivery-agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load delivery agents");
      }
    } catch (err) {
      console.error(err);
      setError("Network error fetching delivery agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  // 1. Add New Agent
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await adminFetch("/api/admin/delivery-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create delivery agent");
      }

      setIsModalOpen(false);
      setForm({ name: "", mobile: "", email: "", password: "" });
      setSuccessMessage(`Delivery executive "${data.agent?.name}" registered successfully.`);
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Open Edit Modal
  const openEditModal = (agent: Agent) => {
    setEditingAgent({
      id: agent.id,
      name: agent.name,
      mobile: agent.mobile,
      email: agent.email || "",
      password: "",
      status: agent.status || "ACTIVE",
      availabilityStatus: agent.deliveryProfile?.availabilityStatus || (agent.deliveryProfile?.isAvailable ? "AVAILABLE" : "OFFLINE"),
    });
    setError(null);
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await adminFetch(`/api/admin/delivery-agents/${editingAgent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAgent),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update delivery agent");
      }

      setIsEditModalOpen(false);
      setEditingAgent(null);
      setSuccessMessage(`Delivery executive "${data.agent?.name || 'details'}" updated successfully.`);
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Quick Toggle Duty Status
  const toggleDutyStatus = async (agent: Agent) => {
    const isCurrentlyOnline =
      agent.deliveryProfile?.availabilityStatus === "AVAILABLE" ||
      agent.deliveryProfile?.isAvailable === true;
    const nextStatus = isCurrentlyOnline ? "OFFLINE" : "AVAILABLE";

    try {
      const res = await adminFetch(`/api/admin/delivery-agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availabilityStatus: nextStatus }),
      });

      if (res.ok) {
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Open Delete Confirmation
  const openDeleteModal = (agent: Agent) => {
    setDeletingAgent(agent);
    setError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingAgent) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await adminFetch(`/api/admin/delivery-agents/${deletingAgent.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete delivery agent");
      }

      setIsDeleteModalOpen(false);
      setDeletingAgent(null);
      setSuccessMessage(data.message || "Delivery executive removed successfully.");
      fetchAgents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-charcoal-700">Delivery Fleet Management</h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Add new executives, edit contact &amp; vehicle details, toggle online duty, and manage fleet accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAgents}
            className="flex items-center gap-2 px-3 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-700 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Fleet
          </button>
          <button
            onClick={() => {
              setError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-crimson-600 hover:bg-crimson-700 text-white text-xs font-semibold rounded-xl shadow-subtle transition"
          >
            <Plus className="w-4 h-4" />
            Add Delivery Executive
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {error && !isModalOpen && !isEditModalOpen && !isDeleteModalOpen && (
        <div className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Agents Table */}
      <div className="bg-white rounded-2xl border border-cream-300 overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100 text-charcoal-500 font-semibold border-b border-cream-200">
              <tr>
                <th className="px-5 py-3.5">Executive Name</th>
                <th className="px-5 py-3.5">Contact Number</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Shift Duty</th>
                <th className="px-5 py-3.5">Active Deliveries</th>
                <th className="px-5 py-3.5">Joined Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-charcoal-400">
                    {loading ? "Loading delivery fleet..." : "No delivery executives registered yet."}
                  </td>
                </tr>
              ) : (
                agents.map((agent) => {
                  const isAvailable =
                    agent.deliveryProfile?.availabilityStatus === "AVAILABLE" ||
                    agent.deliveryProfile?.isAvailable === true;
                  const activeOrders = agent.assignedDeliveries || [];
                  const isAccountActive = agent.status === "ACTIVE";

                  return (
                    <tr key={agent.id} className="hover:bg-cream-50/60 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center font-bold text-charcoal-700">
                            <Bike className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-charcoal-800 block text-xs">
                              {agent.name}
                            </span>
                            <span className="text-[10px] text-charcoal-400 font-mono">
                              ID: {agent.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <a
                            href={`tel:${agent.mobile}`}
                            className="font-mono text-crimson-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            {agent.mobile}
                          </a>
                          {agent.email && (
                            <span className="text-[11px] text-charcoal-400 block truncate max-w-[140px]">
                              {agent.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isAccountActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-charcoal-100 text-charcoal-600"
                          }`}
                        >
                          {isAccountActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleDutyStatus(agent)}
                          title="Click to toggle Shift Duty"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                            isAvailable
                              ? "bg-forest-50 text-forest-700 border border-forest-200 hover:bg-forest-100"
                              : "bg-charcoal-100 text-charcoal-500 border border-charcoal-200 hover:bg-charcoal-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-forest-500 animate-pulse" : "bg-charcoal-400"
                            }`}
                          />
                          <span>{isAvailable ? "ON DUTY (ONLINE)" : "OFFLINE"}</span>
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {activeOrders.length === 0 ? (
                          <span className="text-charcoal-400 text-[11px]">No active runs</span>
                        ) : (
                          <div className="space-y-1">
                            {activeOrders.map((d, i) => (
                              <span
                                key={i}
                                className="inline-block px-2 py-0.5 bg-amberGold-100 text-amberGold-800 border border-amberGold-200 rounded font-mono text-[10px] font-bold mr-1"
                              >
                                #{d.order?.orderNumber} ({d.status})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-charcoal-500 text-[11px]">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(agent)}
                            title="Edit Executive Details"
                            className="p-1.5 rounded-lg border border-cream-300 text-charcoal-600 hover:text-charcoal-900 hover:bg-cream-100 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(agent)}
                            title="Delete Executive"
                            className="p-1.5 rounded-lg border border-crimson-200 text-crimson-600 hover:text-crimson-800 hover:bg-crimson-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Register Executive Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Delivery Executive"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Mobile Number (10 Digits) *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })}
                placeholder="9876543210"
                className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ramesh@freshchicken.com"
                className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Portal Login Password *
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold hover:bg-cream-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {submitting ? "Registering..." : "Register Executive"}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Executive Modal */}
      {editingAgent && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAgent(null);
          }}
          title={`Edit Executive: ${editingAgent.name}`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editingAgent.name}
                onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editingAgent.mobile}
                  onChange={(e) =>
                    setEditingAgent({
                      ...editingAgent,
                      mobile: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs font-mono text-charcoal-800 focus:outline-none focus:border-amberGold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={editingAgent.email}
                  onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                  placeholder="name@freshchicken.com"
                  className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editingAgent.status}
                  onChange={(e) => setEditingAgent({ ...editingAgent, status: e.target.value })}
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Shift / Duty Status
                </label>
                <select
                  value={editingAgent.availabilityStatus}
                  onChange={(e) =>
                    setEditingAgent({
                      ...editingAgent,
                      availabilityStatus: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
                >
                  <option value="AVAILABLE">ONLINE (Available for dispatch)</option>
                  <option value="BUSY">BUSY (On a delivery run)</option>
                  <option value="OFFLINE">OFFLINE (Off duty)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Reset Login Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep existing password"
                value={editingAgent.password}
                onChange={(e) =>
                  setEditingAgent({
                    ...editingAgent,
                    password: e.target.value as any,
                  })
                }
                className="w-full px-3.5 py-2 bg-cream-50 border border-cream-300 rounded-xl text-xs text-charcoal-800 focus:outline-none focus:border-amberGold-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingAgent(null);
                }}
                className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold hover:bg-cream-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Confirm Delete Modal */}
      {deletingAgent && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingAgent(null);
          }}
          title="Delete Delivery Executive"
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-charcoal-700 leading-relaxed">
              Are you sure you want to permanently delete delivery executive{" "}
              <strong>&ldquo;{deletingAgent.name}&rdquo;</strong> (Mobile: {deletingAgent.mobile})?
            </p>

            {deletingAgent.assignedDeliveries && deletingAgent.assignedDeliveries.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl">
                Warning: This executive currently has active assigned orders. You cannot delete an executive while orders are in progress.
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingAgent(null);
                }}
                className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold hover:bg-cream-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
