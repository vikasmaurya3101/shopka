"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { OrderData, OrderStatus } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import { getPrepaidAmount, PREPAID_DISCOUNT } from "@/lib/utils/discount";
import Loader from "@/components/ui/Loader";
import { COMPANY } from "@/lib/company";

const RETURN_WINDOW_DAYS = 3;
// Cancellation stays open through "Shipped" — once it's Out for Delivery,
// the courier already has it, so it can no longer be pulled back.
const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"];

const CANCEL_REASONS = [
  "I want to change the delivery address",
  "I want to change the payment method",
  "I ordered by mistake / duplicate order",
  "I found a better price elsewhere",
  "Expected delivery time is too long",
  "Item is no longer needed",
  "Other",
];

const RETURN_REASONS = [
  "Product was damaged or defective",
  "Wrong product delivered",
  "Product not as described",
  "Missing parts or accessories",
  "I changed my mind",
  "Other",
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showUpdateNote, setShowUpdateNote] = useState<"address" | "contact" | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelOther, setCancelOther] = useState("");
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [returnOther, setReturnOther] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPayingNow, setIsPayingNow] = useState(false);

  function load() {
    setIsLoading(true);
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setOrder(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleCancel() {
    const finalReason = cancelReason === "Other" ? cancelOther.trim() : cancelReason;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason || undefined }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.message ?? "Unable to cancel order."); return; }
      setOrder(json.data);
      setShowCancelForm(false);
      setShowHelpMenu(false);
      toast.success("Order cancelled.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReturn() {
    const finalReason = returnReason === "Other" ? returnOther.trim() : returnReason;
    if (!finalReason) { toast.error("Please select a return reason."); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: finalReason }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.message ?? "Unable to request return."); return; }
      setOrder(json.data);
      setShowReturnForm(false);
      setShowHelpMenu(false);
      toast.success("Return requested. We'll be in touch shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayNow() {
    if (!order) return;
    setIsPayingNow(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) { toast.error("Couldn't load Razorpay. Check your connection."); return; }

      // Create a Razorpay order for the pending payment amount
      const amountPaise = Math.round(
        getPrepaidAmount(Number(order.totalAmount)) * 100
      );
      const orderRes = await fetch("/api/payments/razorpay/create-order-for-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amount: amountPaise }),
      });
      const orderJson = await orderRes.json();
      if (!orderJson.success) { toast.error(orderJson.message ?? "Unable to start payment."); return; }

      const { rzpOrderId, amount, currency, keyId } = orderJson.data;

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: rzpOrderId,
        name: "Shopka",
        description: `Order #${order.invoiceNumber}`,
        image: "/brand/logo-128.png",
        theme: { color: "#d6266f" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch(`/api/orders/${params.id}/pay-now`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            setOrder(verifyJson.data);
            toast.success("Payment successful! 🎉");
          } else {
            toast.error(verifyJson.message ?? "Payment verification failed.");
          }
        },
        modal: { ondismiss: () => setIsPayingNow(false) },
      });
      razorpay.open();
    } catch {
      toast.error("Unable to start payment. Please try again.");
      setIsPayingNow(false);
    }
  }

  if (isLoading) return <main className="min-h-screen bg-gray-50 p-6"><Loader size="lg" /></main>;
  if (notFound || !order) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center"><p className="text-lg text-gray-600">Order not found.</p></main>;
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.orderStatus);
  const daysSinceDelivery = order.deliveredAt
    ? (Date.now() - new Date(order.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  const canReturn = order.orderStatus === "DELIVERED" && daysSinceDelivery !== null && daysSinceDelivery <= RETURN_WINDOW_DAYS;
  const returnWindowExpired = order.orderStatus === "DELIVERED" && daysSinceDelivery !== null && daysSinceDelivery > RETURN_WINDOW_DAYS;

  // Estimated delivery: use per-product days if available, default 5–7
  const maxEstDays = order.items.reduce((max, item) => {
    const days = item.product?.estimatedDeliveryDays ?? 5;
    return Math.max(max, days);
  }, 5);
  const estFrom = new Date(order.placedAt);
  estFrom.setDate(estFrom.getDate() + maxEstDays);
  const estTo = new Date(order.placedAt);
  estTo.setDate(estTo.getDate() + maxEstDays + 2);
  const fmtEstDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const estDeliveryLabel = `${fmtEstDate(estFrom)} – ${fmtEstDate(estTo)}`;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        {/* Product-first header */}
        <div className="mb-6 flex items-center gap-4">
          {order.items[0]?.productImage && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-gray-50">
              <Image
                src={order.items[0].productImage}
                alt={order.items[0].productName}
                fill
                sizes="64px"
                className="object-contain p-1"
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-snug text-gray-900">
              {order.items[0]?.productName ?? "Your Order"}
              {order.items.length > 1 && (
                <span className="ml-1.5 text-sm font-normal text-gray-500">
                  +{order.items.length - 1} more
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              #{order.invoiceNumber} · Placed on{" "}
              {new Date(order.placedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* ── Order Status card ── */}
        <div className="mb-4 rounded-xl border bg-white p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Order Status</h2>

          {/* Cancelled / Returned banner */}
          {(order.orderStatus === "CANCELLED" || order.orderStatus === "RETURNED" || order.orderStatus === "REFUNDED") && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="mb-1 font-semibold">
                {order.orderStatus === "CANCELLED" ? "Order Cancelled" :
                 order.orderStatus === "RETURNED" ? "Return Requested" : "Order Refunded"}
              </div>
              {order.cancelReason && <p>Reason: {order.cancelReason}</p>}
              {order.returnReason && <p>Reason: {order.returnReason}</p>}
              {order.returnRequestedAt && (
                <p className="mt-1 text-xs text-red-500">
                  {new Date(order.returnRequestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          {order.orderStatus !== "CANCELLED" && order.orderStatus !== "REFUNDED" && (() => {
            const STATUS_ORDER: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
            const currentIdx = STATUS_ORDER.indexOf(order.orderStatus);
            const steps = [
              { label: "Order Placed",      subLabel: `Your order has been received. Est. delivery: ${estDeliveryLabel}`, status: "PENDING" as OrderStatus,           date: order.placedAt },
              { label: "Order Confirmed",   subLabel: "Seller has accepted your order.",      status: "CONFIRMED" as OrderStatus,         date: null },
              { label: "Packed & Ready",    subLabel: "Your item is packed and waiting for pickup.", status: "PROCESSING" as OrderStatus, date: null },
              { label: "Shipped",           subLabel: "Item will be on the way.",             status: "SHIPPED" as OrderStatus,           date: null },
              { label: "Out for Delivery",  subLabel: "Item is out for delivery today.",      status: "OUT_FOR_DELIVERY" as OrderStatus,  date: null },
              { label: "Delivered",         subLabel: "Item delivered successfully.",         status: "DELIVERED" as OrderStatus,         date: order.deliveredAt },
            ];

            // 5-point header bar (Placed / Confirmed / Packed / Shipped /
            // Delivered) — Shipped and Out for Delivery share one point here,
            // since the detailed break-out between the two is what the
            // vertical timeline below is for.
            const HEADER_STAGES = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];
            const headerFillPct =
              currentIdx >= 5 ? 100 : currentIdx >= 3 ? 75 : currentIdx >= 2 ? 50 : currentIdx >= 1 ? 25 : 0;
            const headerActiveIdx =
              currentIdx >= 5 ? 4 : currentIdx >= 3 ? 3 : currentIdx >= 2 ? 2 : currentIdx >= 1 ? 1 : 0;

            return (
              <>
                <div className="mb-6">
                  <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide">
                    {HEADER_STAGES.map((label, idx) => (
                      <span key={label} className={idx <= headerActiveIdx ? "text-brand" : "text-gray-400"}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${headerFillPct}%` }}
                    />
                  </div>
                </div>

              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const stepIdx = STATUS_ORDER.indexOf(step.status);
                  const isDone = currentIdx >= stepIdx;
                  const isLast = idx === steps.length - 1;
                  return (
                    <div key={step.status} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}`}>
                          {isDone && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {!isLast && <div className={`my-1 w-0.5 flex-1 ${isDone ? "bg-green-400" : "bg-gray-200"}`} style={{ minHeight: 28 }} />}
                      </div>
                      <div className={`min-w-0 pb-5 ${isLast ? "pb-0" : ""}`}>
                        <div className={`text-sm font-semibold ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                          {step.label}
                          {step.date && isDone && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              {new Date(step.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                              {" · "}
                              {new Date(step.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className={`mt-0.5 text-xs ${isDone ? "text-gray-500" : "text-gray-300"}`}>{step.subLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            );
          })()}

          {/* Payment section */}
          <div className="mt-4 border-t pt-4">
            {order.paymentStatus === "PENDING" && order.orderStatus !== "CANCELLED" ? (
              /* COD order — invite user to pay online and save ₹15 */
              <div className="flex flex-wrap items-center gap-4">
                {/* Price with strikethrough */}
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gray-400 line-through">₹{Number(order.totalAmount).toFixed(0)}</span>
                  <span className="text-lg font-bold text-green-600">₹{getPrepaidAmount(Number(order.totalAmount)).toFixed(0)}</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">-₹{PREPAID_DISCOUNT}</span>
                </div>
                {/* Pay Now button */}
                <button
                  onClick={handlePayNow}
                  disabled={isPayingNow}
                  className="flex items-center gap-2 rounded-full bg-green-600 px-5 py-2 text-sm font-bold text-white shadow transition hover:bg-green-700 disabled:opacity-60"
                >
                  {isPayingNow ? "Opening..." : "💳 Pay Now & Save ₹" + PREPAID_DISCOUNT}
                </button>
                <p className="w-full text-xs text-gray-400">Pay online now to save ₹{PREPAID_DISCOUNT} on this order.</p>
              </div>
            ) : order.paymentStatus === "PAID" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                ✓ Paid
              </span>
            ) : order.paymentStatus === "REFUNDED" ? (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                Refunded
              </span>
            ) : null}
          </div>

          {returnWindowExpired && (
            <p className="mt-3 text-xs text-gray-400">The {RETURN_WINDOW_DAYS}-day return window for this order has passed.</p>
          )}

          {/* Need Help — a single low-key entry point instead of a bare
              "Cancel Order" button. Cancel/return/address/contact all live
              as options inside it, so the default view doesn't nudge
              everyone toward cancelling. */}
          {order.orderStatus !== "CANCELLED" &&
            order.orderStatus !== "RETURNED" &&
            order.orderStatus !== "REFUNDED" &&
            !showCancelForm &&
            !showReturnForm && (
              <div className="mt-4 border-t pt-4">
                {!showHelpMenu ? (
                  <button
                    onClick={() => setShowHelpMenu(true)}
                    className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Need help with this order?
                    <span className="text-gray-400">▾</span>
                  </button>
                ) : (
                  <div className="rounded-xl border bg-gray-50 p-2">
                    <button
                      onClick={() => setShowUpdateNote("address")}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-white"
                    >
                      Update delivery address <span className="text-gray-400">›</span>
                    </button>
                    <button
                      onClick={() => setShowUpdateNote("contact")}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-white"
                    >
                      Update contact number <span className="text-gray-400">›</span>
                    </button>
                    {canReturn && (
                      <button
                        onClick={() => { setShowHelpMenu(false); setShowUpdateNote(null); setShowReturnForm(true); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-white"
                      >
                        Return or replace item <span className="text-gray-400">›</span>
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => { setShowHelpMenu(false); setShowUpdateNote(null); setShowCancelForm(true); }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel this order <span className="text-red-300">›</span>
                      </button>
                    )}

                    {showUpdateNote && (
                      <div className="mt-1 rounded-lg border border-brand/30 bg-brand-50/40 p-3 text-xs text-gray-600">
                        For order safety we don&apos;t edit a placed order&apos;s{" "}
                        {showUpdateNote === "address" ? "address" : "contact number"} directly here —
                        our support team can update it for you in a couple of minutes.
                      </div>
                    )}

                    <div className="mt-2 border-t pt-2">
                      <p className="px-3 pb-1.5 text-xs text-gray-400">Problem not listed?</p>
                      <a
                        href={`mailto:${COMPANY.operatorEmail}?subject=${encodeURIComponent(
                          `Help with order #${order.invoiceNumber}`
                        )}`}
                        className="flex items-center justify-center gap-2 rounded-lg border-2 border-brand px-3 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-50"
                      >
                        ✉️ Mail Us
                      </a>
                    </div>

                    <button
                      onClick={() => { setShowHelpMenu(false); setShowUpdateNote(null); }}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-center text-xs text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Cancel form */}
          {showCancelForm && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Why are you cancelling?</p>
              <div className="space-y-2">
                {CANCEL_REASONS.map((r) => (
                  <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm transition ${cancelReason === r ? "border-brand bg-brand-50/40" : "border-gray-200"}`}>
                    <input type="radio" name="cancelReason" checked={cancelReason === r} onChange={() => setCancelReason(r)} className="accent-brand" />
                    {r}
                  </label>
                ))}
              </div>
              {cancelReason === "Other" && (
                <textarea
                  value={cancelOther}
                  onChange={(e) => setCancelOther(e.target.value)}
                  rows={2}
                  placeholder="Please describe your reason..."
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
                />
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={handleCancel} disabled={isSubmitting || (cancelReason === "Other" && !cancelOther.trim())}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
                </button>
                <button onClick={() => { setShowCancelForm(false); setShowHelpMenu(true); }} className="rounded-lg border px-4 py-2 text-sm">Back</button>
              </div>
            </div>
          )}

          {/* Return form */}
          {showReturnForm && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-700">Why are you returning this item?</p>
              <div className="space-y-2">
                {RETURN_REASONS.map((r) => (
                  <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm transition ${returnReason === r ? "border-brand bg-brand-50/40" : "border-gray-200"}`}>
                    <input type="radio" name="returnReason" checked={returnReason === r} onChange={() => setReturnReason(r)} className="accent-brand" />
                    {r}
                  </label>
                ))}
              </div>
              {returnReason === "Other" && (
                <textarea
                  value={returnOther}
                  onChange={(e) => setReturnOther(e.target.value)}
                  rows={2}
                  placeholder="Please describe the issue..."
                  className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
                />
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={handleReturn} disabled={isSubmitting || (returnReason === "Other" && !returnOther.trim())}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {isSubmitting ? "Submitting..." : "Submit Return"}
                </button>
                <button onClick={() => { setShowReturnForm(false); setShowHelpMenu(true); }} className="rounded-lg border px-4 py-2 text-sm">Back</button>
              </div>
            </div>
          )}
        </div>

        {/* Tracking info */}
        {order.trackingNumber && (
          <div className="mb-4 rounded-xl border bg-white p-5">
            <h2 className="mb-2 font-semibold text-gray-800">Shipment Tracking</h2>
            <p className="text-sm text-gray-600">Tracking #: <span className="font-medium text-gray-900">{order.trackingNumber}</span></p>
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Track Shipment →
              </a>
            )}
          </div>
        )}

        {/* Delivery address */}
        <div className="mb-4 rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-semibold text-gray-800">Delivery Address</h2>
          <p className="text-sm text-gray-700">{order.address.fullName} · {order.address.phone}</p>
          <p className="text-sm text-gray-600">{order.address.completeAddress}</p>
          {order.address.latitude && order.address.longitude && (
            <a href={`https://www.google.com/maps?q=${order.address.latitude},${order.address.longitude}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-medium text-brand hover:underline">
              View exact drop location on map →
            </a>
          )}
        </div>

        {/* Items */}
        <div className="mb-4 rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-semibold text-gray-800">Product Details</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {item.productImage && (
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <Image src={item.productImage} alt={item.productName} fill sizes="56px" className="object-contain p-1" />
                  </div>
                )}
                <div className="flex flex-1 justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price details */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-semibold text-gray-800">Price Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{formatCurrency(order.shippingCharge)}</span></div>
            <div className="flex justify-between text-gray-600"><span>Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold text-gray-900"><span>Total</span><span>{formatCurrency(order.totalAmount)}</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}
