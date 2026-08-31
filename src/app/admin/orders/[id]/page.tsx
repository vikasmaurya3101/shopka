"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import Loader from "@/components/ui/Loader";
import { formatCurrency } from "@/lib/utils/currency";

interface OrderDetail {
  id: string;
  invoiceNumber: string;
  subtotal: number | string;
  discountAmount: number | string;
  shippingCharge: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  orderStatus: string;
  paymentStatus: string;
  shipmentStatus: string;
  placedAt: string;
  items: {
    id: string;
    productName: string;
    productImage: string | null;
    sku: string;
    quantity: number;
    sellingPrice: number | string;
    totalAmount: number | string;
  }[];
  payment: {
    method: string;
    status: string;
    amount: number | string;
    paidAt: string | null;
  } | null;
  cancelReason: string | null;
  returnReason: string | null;
  returnRequestedAt: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  address: {
    fullName: string;
    phone: string;
    houseNumber: string;
    apartment: string | null;
    area: string;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
    profileImage: string | null;
    createdAt: string;
  };
}

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
];

const SHIPMENT_STATUSES = [
  "PENDING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
  "FAILED",
];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading: isSessionLoading } = useSession();
  const isAuthorized =
    isAuthenticated && (user?.role === "ADMIN" || user?.role === "SELLER");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippingDraft, setShippingDraft] = useState("0");
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setOrderStatus(json.data.orderStatus);
        setShipmentStatus(json.data.shipmentStatus);
        setTrackingNumber(json.data.trackingNumber ?? "");
        setTrackingUrl(json.data.trackingUrl ?? "");
        setShippingDraft(String(Number(json.data.shippingCharge) || 0));
      } else {
        toast.error(json.message ?? "Unable to load order.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isAuthorized) load();
  }, [isAuthorized, load]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus,
          shipmentStatus,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Unable to update order.");
        return;
      }
      setOrder(json.data);
      toast.success("Order updated.");
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Per-order delivery override. The API adjusts `totalAmount` by the delta and
   * refuses outright once the order is paid, so this only ever appears on
   * COD / unpaid orders.
   */
  async function handleSaveShipping() {
    const charge = Number(shippingDraft);

    if (shippingDraft.trim() === "" || !Number.isFinite(charge) || charge < 0) {
      toast.error("Delivery charge must be 0 or more.");
      return;
    }

    setIsSavingShipping(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCharge: charge }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Unable to update delivery charge.");
        return;
      }

      setOrder(json.data);
      setShippingDraft(String(Number(json.data.shippingCharge) || 0));
      toast.success(
        charge === 0 ? "Delivery set to free." : "Delivery charge updated."
      );
    } finally {
      setIsSavingShipping(false);
    }
  }

  async function handleMarkRefunded() {
    if (!confirm("Mark this order as REFUNDED? This records that the refund was issued to the customer.")) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: "REFUNDED" }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.message ?? "Unable to update."); return; }
      setOrder(json.data);
      setOrderStatus("REFUNDED");
      toast.success("Order marked as refunded.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (
      !confirm(
        "Cancel this order? Stock will be restored and payment (if paid) marked refunded."
      )
    )
      return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: "CANCELLED" }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Unable to cancel order.");
        return;
      }
      setOrder(json.data);
      setOrderStatus("CANCELLED");
      toast.success("Order cancelled.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSessionLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">
          You don&apos;t have access to this page.
        </p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">Order not found.</p>
      </main>
    );
  }

  // The money is already collected, so the delivery charge is frozen — changing
  // the total now would make the record disagree with what the gateway captured.
  const isPaid =
    order.paymentStatus === "PAID" || order.payment?.status === "PAID";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            Order {order.invoiceNumber}
          </h1>
          <div className="flex gap-2">
            {order.orderStatus === "RETURNED" && (
              <button
                onClick={handleMarkRefunded}
                disabled={isSaving}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                Mark as Refunded
              </button>
            )}
            {order.orderStatus !== "CANCELLED" &&
              order.orderStatus !== "DELIVERED" &&
              order.orderStatus !== "REFUNDED" && (
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="rounded-xl border-2 border-red-500 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel Order
                </button>
              )}
          </div>
        </div>

        {order.orderStatus === "RETURNED" && (
          <div className="mb-6 rounded-xl border-2 border-orange-300 bg-orange-50 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-semibold text-orange-800">
              <span className="text-lg">⚠️</span> Return Requested — Action Required
            </div>
            <p className="text-orange-700">
              Customer has requested a return. Review the reason below and either approve the refund or contact the customer.
            </p>
          </div>
        )}

        {order.cancelReason && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span className="font-semibold">Cancellation reason:</span>{" "}
            {order.cancelReason}
          </div>
        )}
        {order.returnReason && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <span className="font-semibold">Return reason:</span>{" "}
            {order.returnReason}
            {order.returnRequestedAt && (
              <span className="ml-2 text-xs text-amber-500">
                Requested{" "}
                {new Date(order.returnRequestedAt).toLocaleDateString("en-IN")}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Customer */}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">Customer</h2>
            <div className="flex items-center gap-3">
              {order.user.profileImage ? (
                <Image
                  src={order.user.profileImage}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand">
                  {order.user.firstName?.[0] ?? "U"}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-800">
                  {order.user.firstName} {order.user.lastName}
                </div>
                <div className="text-xs text-gray-400">
                  Member since{" "}
                  {new Date(order.user.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <div>📞 {order.user.phone}</div>
              {order.user.email && <div>✉️ {order.user.email}</div>}
            </div>
          </div>

          {/* Delivery address */}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 font-semibold text-gray-800">
              Delivery Address
            </h2>
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-800">
                {order.address.fullName} · {order.address.phone}
              </div>
              <div>
                {order.address.houseNumber}
                {order.address.apartment ? `, ${order.address.apartment}` : ""}
                , {order.address.area}
              </div>
              {order.address.landmark && <div>{order.address.landmark}</div>}
              <div>
                {order.address.city}, {order.address.state} -{" "}
                {order.address.pincode}
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 rounded-xl border bg-white">
          <h2 className="border-b p-4 font-semibold text-gray-800">Items</h2>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border-b p-4 last:border-0"
            >
              {item.productImage && (
                <Image
                  src={item.productImage}
                  alt={item.productName}
                  width={48}
                  height={48}
                  className="rounded-md object-cover"
                />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {item.productName}
                </div>
                <div className="text-xs text-gray-400">
                  SKU: {item.sku} · Qty: {item.quantity} ×{" "}
                  {formatCurrency(item.sellingPrice)}
                </div>
              </div>
              <div className="font-medium text-gray-800">
                {formatCurrency(item.totalAmount)}
              </div>
            </div>
          ))}
          <div className="space-y-1 p-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Discount</span>
              <span>-{formatCurrency(order.discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-gray-500">
              <span>Shipping</span>
              {isPaid ? (
                <span
                  title="Locked — this order is already paid."
                  className={
                    Number(order.shippingCharge) === 0
                      ? "font-medium text-success"
                      : undefined
                  }
                >
                  {Number(order.shippingCharge) === 0
                    ? "FREE"
                    : formatCurrency(order.shippingCharge)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={shippingDraft}
                    disabled={isSavingShipping}
                    onChange={(e) => setShippingDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveShipping();
                      }
                    }}
                    aria-label="Delivery charge in rupees"
                    className="w-20 rounded-lg border px-2 py-1 text-right text-sm outline-none focus:border-brand disabled:opacity-50"
                  />
                  <button
                    onClick={handleSaveShipping}
                    disabled={
                      isSavingShipping ||
                      Number(shippingDraft) === Number(order.shippingCharge)
                    }
                    className="rounded-lg border px-2 py-1 text-xs font-semibold text-brand disabled:opacity-40"
                  >
                    {isSavingShipping ? "Saving…" : "Save"}
                  </button>
                </span>
              )}
            </div>
            <div className="flex justify-between font-semibold text-gray-800">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        {order.payment && (
          <div className="mt-6 rounded-xl border bg-white p-4">
            <h2 className="mb-2 font-semibold text-gray-800">Payment</h2>
            <div className="text-sm text-gray-600">
              <div>Method: {order.payment.method}</div>
              <div>Status: {order.payment.status}</div>
              {order.payment.paidAt && (
                <div>
                  Paid at:{" "}
                  {new Date(order.payment.paidAt).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status controls */}
        <div className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Update Status</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Order Status
              </label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Shipment Status
              </label>
              <select
                value={shipmentStatus}
                onChange={(e) => setShipmentStatus(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {SHIPMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>

          {/* Tracking */}
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tracking (optional)</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="mb-1 block text-xs text-gray-500">Tracking Number</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 7645392847"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div className="flex-1 min-w-[240px]">
                <label className="mb-1 block text-xs text-gray-500">Tracking URL</label>
                <input
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://track.delhivery.com/..."
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
