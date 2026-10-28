"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Navigation,
  DollarSign,
  Package,
  CheckCircle2,
  Bike,
  AlertCircle,
  ExternalLink,
  QrCode,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/delivery";
import { Modal } from "@/components/ui/Modal";

export default function DeliveryOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delivery Handover Modal
  const [isDeliverModalOpen, setIsDeliverModalOpen] = useState(false);
  const [collectionMethodChoice, setCollectionMethodChoice] = useState<"CASH" | "ONLINE_DOORSTEP">("CASH");
  const [codCollectedVerified, setCodCollectedVerified] = useState(false);

  // Doorstep Dynamic QR Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [qrCopied, setQrCopied] = useState(false);
  const [qrPaidConfirmed, setQrPaidConfirmed] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/delivery/assignments/${id}`);
      if (!res.ok) {
        throw new Error("Failed to load delivery assignment");
      }
      const data = await res.json();
      setAssignment(data.assignment);
      if (data.assignment?.order?.payment?.status === "COMPLETED") {
        setQrPaidConfirmed(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAssignment();
  }, [id]);

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleStartDelivery = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/delivery/assignments/${id}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start delivery run");
      }
      fetchAssignment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenOnlineQrModal = async () => {
    if (!assignment?.order) return;
    setIsQrModalOpen(true);
    setQrLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/delivery/orders/${assignment.order.id}/collect-online`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate dynamic doorstep QR");
      }
      setQrData(data);

      // Start authoritative status polling every 3.5s
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/pay/status?orderId=${assignment.order.id}`);
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === "COMPLETED") {
              setQrPaidConfirmed(true);
              setCollectionMethodChoice("ONLINE_DOORSTEP");
              if (pollingRef.current) clearInterval(pollingRef.current);
              fetchAssignment();
            }
          }
        } catch {
          // Non-blocking poll
        }
      }, 3500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  const handleManualUpiCompleted = async () => {
    if (!assignment?.order) return;
    const confirmed = window.confirm(
      `Did you check your UPI app and verify that ${formatCurrency(assignment.order.totalMinor)} has arrived into the merchant account?`
    );
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/delivery/assignments/${id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionMethod: "UPI_MANUAL_VERIFIED",
          notes: "Doorstep UPI manual agent confirmation",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record UPI collection and deliver");
      }
      setIsQrModalOpen(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
      fetchAssignment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const ord = assignment.order;
      const isCod = ord.payment?.method === "COD" || (ord.codFeeMinor || 0) > 0 || ord.paymentMethod === "COD";
      const isPaid = ord.payment?.status === "COMPLETED" || qrPaidConfirmed;

      const chosenMethod = isPaid ? (isCod ? "ONLINE_DOORSTEP" : "PREPAID") : "CASH";

      const res = await fetch(`/api/delivery/assignments/${id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionMethod: chosenMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark order as delivered");
      }
      setIsDeliverModalOpen(false);
      handleCloseQrModal();
      fetchAssignment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-charcoal-400 font-mono">
        Loading delivery run sheet...
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-cream-300 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-crimson-600 mx-auto" />
        <p className="text-sm font-semibold text-charcoal-700">Delivery Assignment Not Found</p>
        <Link
          href="/delivery"
          className="inline-flex items-center gap-2 px-4 py-2 bg-cream-200 text-charcoal-700 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const ord = assignment.order;
  const addr = ord.deliveryAddress || {};
  const isCod = ord.payment?.method === "COD" || (ord.codFeeMinor || 0) > 0 || ord.paymentMethod === "COD";
  const isPaid = ord.payment?.status === "COMPLETED" || qrPaidConfirmed;
  const collection = ord.deliveryCollection;

  const primaryAddressLine = addr.addressLine || addr.line1 || (typeof addr === "string" ? addr : "Delivery Address");
  const secondaryAddressLine = addr.locality || addr.line2 || "";
  const addressCity = addr.city || "Mulbagal";
  const addressPostal = addr.postalCode || "563131";

  // Google Maps navigation link
  const mapsUrl =
    addr.latitude && addr.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${addr.latitude},${addr.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${primaryAddressLine} ${secondaryAddressLine} ${addressCity} ${addressPostal}`
        )}`;

  return (
    <div className="space-y-5 pb-12">
      {/* Back button & Status */}
      <div className="flex items-center justify-between">
        <Link
          href="/delivery"
          className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Runs
        </Link>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            assignment.status === "STARTED"
              ? "bg-amberGold-100 text-amberGold-800 border border-amberGold-300 animate-pulse"
              : assignment.status === "DELIVERED"
              ? "bg-forest-100 text-forest-800 border border-forest-300"
              : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}
        >
          {assignment.status === "STARTED"
            ? "Out for Delivery"
            : assignment.status === "ASSIGNED"
            ? "Assigned (At Hub)"
            : "Delivered"}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-crimson-50 border border-crimson-200 text-crimson-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Primary Customer Card */}
      <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-cream-200 pb-3">
          <div>
            <span className="text-[10px] text-charcoal-400 uppercase font-mono block">
              Customer Name
            </span>
            <span className="text-base font-bold text-charcoal-800">
              {ord.user?.name || "Customer"}
            </span>
          </div>

          {ord.user?.mobile && (
            <a
              href={`tel:${ord.user.mobile}`}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-subtle"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </a>
          )}
        </div>

        {/* Address & Navigation */}
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-charcoal-700">
            <MapPin className="w-4 h-4 text-crimson-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-charcoal-800">
                {primaryAddressLine}
                {secondaryAddressLine ? `, ${secondaryAddressLine}` : ""}
              </p>
              {addr.landmark && (
                <p className="text-[11px] text-amberGold-700 font-medium mt-0.5">
                  Landmark: {addr.landmark}
                </p>
              )}
              <p className="text-[11px] text-charcoal-500 mt-0.5">
                {addressCity}
                {addr.state ? `, ${addr.state}` : ""} - {addressPostal}
              </p>
            </div>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cream-200 hover:bg-cream-300 text-charcoal-800 rounded-xl text-xs font-bold transition"
          >
            <Navigation className="w-4 h-4 text-blue-600" />
            Open Turn-by-Turn GPS in Google Maps
            <ExternalLink className="w-3.5 h-3.5 text-charcoal-400" />
          </a>
        </div>
      </div>

      {/* Payment & Settlement Card */}
      <div
        className={`p-4 rounded-2xl border ${
          isPaid
            ? "bg-forest-50 border-forest-200 text-forest-800"
            : isCod
            ? "bg-amberGold-50 border-amberGold-300 text-charcoal-800"
            : "bg-forest-50 border-forest-200 text-forest-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
              Payment Settlement
            </span>
            <span className="font-bold text-sm">
              {collection?.collectionMethod === "ONLINE_DOORSTEP"
                ? "Paid Online at Doorstep"
                : collection?.collectionMethod === "CASH"
                ? "Cash Collected at Doorstep"
                : isPaid
                ? "Prepaid Online (Verified)"
                : isCod
                ? "Cash On Delivery (COD)"
                : "Prepaid Online"}
            </span>
            <span className="text-[10px] block font-mono text-charcoal-500 mt-0.5">
              Original Method: {isCod ? "COD" : (ord.payment?.method || "ONLINE")}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono block opacity-75">
              {isPaid ? "Status" : isCod ? "Collect From Customer" : "Balance Due"}
            </span>
            <span className="text-xl font-mono font-bold">
              {isPaid ? "PAID ₹0 DUE" : isCod ? formatCurrency(ord.totalMinor) : "₹0 (Paid)"}
            </span>
          </div>
        </div>

        {/* Doorstep Online QR Action Button for unpaid COD */}
        {!isPaid && isCod && assignment.status !== "DELIVERED" && (
          <div className="mt-3 pt-3 border-t border-amberGold-200 flex items-center justify-between">
            <span className="text-[11px] font-medium text-charcoal-600">
              Customer wants to pay online via UPI?
            </span>
            <button
              onClick={handleOpenOnlineQrModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal-800 hover:bg-black text-amberGold-300 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5 text-amberGold-400" />
              Collect Online (Dynamic QR)
            </button>
          </div>
        )}
      </div>

      {/* Order Package Checklist */}
      <div className="bg-white p-5 rounded-2xl border border-cream-300 shadow-subtle space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-cream-200">
          <Package className="w-4 h-4 text-charcoal-500" />
          <h3 className="font-bold text-xs text-charcoal-800">
            Packaged Cuts Checklist ({ord.items.length} item{ord.items.length > 1 ? "s" : ""})
          </h3>
        </div>

        <div className="divide-y divide-cream-100">
          {ord.items.map((item: any) => {
            const prodName = item.productNameSnapshot || item.productName || item.product?.name || "Fresh Item";
            const varName = item.variantNameSnapshot || item.variantName || item.variant?.name || "Standard";
            const price =
              item.lineTotalMinor ??
              (item.unitPriceMinor
                ? item.unitPriceMinor * item.quantity
                : item.priceMinor
                ? item.priceMinor * item.quantity
                : 0);
            return (
              <div key={item.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                <div>
                  <span className="font-semibold text-charcoal-800 block">{prodName}</span>
                  <span className="text-[11px] text-charcoal-500">
                    {varName} &bull; Qty: {item.quantity}{" "}
                    {item.weightGrams ? `(${item.weightGrams}g each)` : ""}
                  </span>
                  {(() => {
                    let customOpts: any[] = [];
                    if (item.customizationSnapshotJson) {
                      try {
                        customOpts = JSON.parse(item.customizationSnapshotJson);
                      } catch {}
                    }
                    if (!customOpts || customOpts.length === 0) return null;
                    return (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {customOpts.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-cream-100 text-[10px] text-charcoal-700 border border-cream-300 font-semibold"
                          >
                            {c.group ? `${c.group}: ` : ""}{c.option}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <span className="font-mono font-semibold text-charcoal-700 whitespace-nowrap">
                  {formatCurrency(price)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="space-y-3 pt-2">
        {assignment.status === "ASSIGNED" && (
          <button
            onClick={handleStartDelivery}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-amberGold-500 hover:bg-amberGold-600 text-charcoal-900 rounded-2xl text-sm font-black shadow-md transition active:scale-[0.99] disabled:opacity-50 uppercase tracking-wider"
          >
            <Bike className="w-5 h-5 text-charcoal-900" />
            {actionLoading ? "Updating..." : "Start Delivery Run (Leave Hub)"}
          </button>
        )}

        {assignment.status === "STARTED" && (
          <button
            onClick={() => setIsDeliverModalOpen(true)}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black shadow-md transition active:scale-[0.99] disabled:opacity-50 uppercase tracking-wider cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            Confirm Handover & Deliver
          </button>
        )}

        {assignment.status === "DELIVERED" && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-subtle">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Order delivered successfully on {new Date(assignment.deliveredAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Doorstep Dynamic QR Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={handleCloseQrModal}
        title="Doorstep Dynamic Merchant UPI QR"
      >
        <div className="space-y-4 text-center">
          {qrLoading ? (
            <div className="py-8 space-y-2">
              <RefreshCw className="w-8 h-8 text-amberGold-600 animate-spin mx-auto" />
              <p className="text-xs text-charcoal-500 font-mono">Generating dynamic merchant QR...</p>
            </div>
          ) : qrPaidConfirmed ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">Payment Confirmed!</h4>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Bank verification confirmed receipt of {formatCurrency(ord.totalMinor)} into Fresh Chicken Centre merchant account.
              </p>
              <button
                onClick={() => {
                  handleCloseQrModal();
                  setIsDeliverModalOpen(true);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Proceed to Confirm Delivery Handover
              </button>
            </div>
          ) : qrData ? (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-2xl border border-cream-300 inline-block shadow-subtle mx-auto">
                {qrData.qrCodeImage ? (
                  <img
                    src={qrData.qrCodeImage}
                    alt="Doorstep UPI QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-cream-100 rounded-xl">
                    <QrCode className="w-16 h-16 text-charcoal-400" />
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs text-charcoal-500 block">Exact Payable Amount</span>
                <span className="text-2xl font-mono font-black text-charcoal-900">
                  {formatCurrency(ord.totalMinor)}
                </span>
                <span className="text-[11px] block font-mono text-charcoal-500 mt-0.5">
                  Merchant: Fresh Chicken Centre (7975137618@okbizaxis)
                </span>
              </div>

              <div className="p-3 bg-amberGold-50 border border-amberGold-200 rounded-xl text-left text-[11px] text-charcoal-700 space-y-1">
                <p className="font-semibold text-charcoal-900">Doorstep Dynamic UPI QR</p>
                <p>
                  Ask customer to scan with Google Pay, PhonePe, Paytm, or BHIM. After verifying the incoming transfer in your receiving bank app, press Payment Completed below.
                </p>
              </div>

              {/* Payment Completed button per Requirement 6.3 & 6.4 */}
              <button
                type="button"
                onClick={handleManualUpiCompleted}
                disabled={actionLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{actionLoading ? "Recording Collection..." : "Payment Completed (Confirmed in App)"}</span>
              </button>


              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(qrData.qrPayload || "");
                    setQrCopied(true);
                    setTimeout(() => setQrCopied(false), 2000);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cream-200 hover:bg-cream-300 text-charcoal-800 rounded-xl text-xs font-semibold transition"
                >
                  {qrCopied ? <Check className="w-3.5 h-3.5 text-forest-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {qrCopied ? "UPI Copied" : "Copy UPI URI"}
                </button>

                <button
                  type="button"
                  onClick={handleCloseQrModal}
                  className="px-4 py-2.5 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Delivery Handover Confirmation Modal */}
      <Modal
        isOpen={isDeliverModalOpen}
        onClose={() => setIsDeliverModalOpen(false)}
        title="Confirm Order Handover & Settlement"
      >
        <div className="space-y-4">
          <p className="text-xs text-charcoal-600 leading-relaxed">
            Please confirm that the fresh cuts package has been delivered to the customer in hygienic condition.
          </p>

          {isPaid ? (
            <div className="p-3 bg-forest-50 border border-forest-300 rounded-xl text-xs text-forest-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-forest-600" />
                <span>ONLINE PAYMENT VERIFIED & SETTLED</span>
              </div>
              <p className="text-xs">
                Total {formatCurrency(ord.totalMinor)} confirmed. No cash collection required.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amberGold-50 border border-amberGold-300 rounded-xl text-xs text-charcoal-800 space-y-2">
              <div className="flex items-center gap-1.5 text-crimson-800 font-bold">
                <DollarSign className="w-4 h-4" />
                <span>CASH COLLECTION MANDATORY</span>
              </div>
              <p className="text-xs">
                You must collect exactly <strong>{formatCurrency(ord.totalMinor)}</strong> in cash from the customer.
              </p>
              <label className="flex items-center gap-2 pt-1 font-semibold text-charcoal-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={codCollectedVerified}
                  onChange={(e) => setCodCollectedVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-forest-600 focus:ring-forest-500 accent-forest-600"
                />
                <span>I confirm I received {formatCurrency(ord.totalMinor)} cash</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDeliverModalOpen(false)}
              className="px-4 py-2 border border-cream-300 text-charcoal-600 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCompleteDelivery}
              disabled={actionLoading || (!isPaid && !codCollectedVerified)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
            >
              {actionLoading
                ? "Completing..."
                : isPaid
                ? "Confirm Delivery Handover (Online Paid)"
                : "Confirm COD Received & Handover Complete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
