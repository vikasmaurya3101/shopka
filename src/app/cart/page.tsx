"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useSession } from "@/providers/SessionProvider";
import { formatCurrency } from "@/lib/utils/currency";
import { calculateShipping, toShippableLines } from "@/lib/utils/shipping";
import Loader from "@/components/ui/Loader";

interface AppliedCoupon {
  code: string;
  type: string;
  discountAmount: number;
}

/* ── Qty stepper — always visible, attractive ── */
function QtyStepper({
  value,
  onDecrease,
  onIncrease,
  onRemove,
  disabled,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
      <button
        onClick={value <= 1 ? onRemove : onDecrease}
        disabled={disabled}
        aria-label={value <= 1 ? "Remove item" : "Decrease quantity"}
        className={`flex h-8 w-8 items-center justify-center rounded-xl transition active:scale-90 disabled:opacity-40 ${
          value <= 1
            ? "bg-red-100 text-red-500 hover:bg-red-200"
            : "bg-white text-gray-700 shadow-sm hover:bg-brand hover:text-white"
        }`}
      >
        {value <= 1 ? <Trash2 size={14} /> : <Minus size={14} />}
      </button>

      <span className="w-7 text-center text-sm font-bold text-gray-800">
        {value}
      </span>

      <button
        onClick={onIncrease}
        disabled={disabled}
        aria-label="Increase quantity"
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition hover:bg-brand hover:text-white active:scale-90 disabled:opacity-40"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function CartPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const { cart, isLoading, isMutating, updateQuantity, removeItem } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (isSessionLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/10">
          <ShoppingBag size={36} className="text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Your cart is empty</h1>
        <p className="max-w-xs text-sm text-gray-500">
          Looks like you haven&apos;t added anything yet. Let&apos;s fix that.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-2xl bg-brand px-8 py-3 font-semibold text-white shadow-md shadow-brand/30 transition hover:bg-brand-dark active:scale-95"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
    0
  );
  const mrpTotal = items.reduce(
    (sum, item) => sum + Number(item.product.mrp) * item.quantity,
    0
  );
  const shipping =
    coupon?.type === "FREE_SHIPPING" ? 0 : calculateShipping(toShippableLines(items));
  const couponDiscount = coupon?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + shipping - couponDiscount);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const json = await res.json();
      if (!json.success) {
        setCouponError(json.message ?? "Unable to apply coupon.");
        setCoupon(null);
        return;
      }
      setCoupon(json.data);
      setCouponInput("");
    } catch {
      setCouponError("Unable to apply coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    await removeItem(itemId);
    setRemovingId(null);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 sm:text-3xl">
          My Cart{" "}
          <span className="text-base font-normal text-gray-400">
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Cart items ── */}
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => {
              const thumbnail =
                item.product.images.find((img) => img.isThumbnail)?.url ??
                item.product.images[0]?.url ??
                "/placeholder-product.png";

              const mrp = Number(item.product.mrp);
              const price = Number(item.product.sellingPrice);
              const off = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
              const isRemoving = removingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 ${
                    isRemoving ? "scale-95 opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Product image */}
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-50"
                    >
                      <Image
                        src={thumbnail}
                        alt={item.product.name}
                        fill
                        sizes="96px"
                        className="object-contain p-1.5 transition hover:scale-105"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-brand"
                        >
                          {item.product.name}
                        </Link>

                        {/* Delete button — always visible, top right */}
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={isMutating || isRemoving}
                          aria-label="Remove item"
                          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500 active:scale-90 disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Price row */}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(price)}
                        </span>
                        {off > 0 && (
                          <>
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(mrp)}
                            </span>
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">
                              {off}% OFF
                            </span>
                          </>
                        )}
                      </div>

                      {/* Qty stepper row */}
                      <div className="mt-3 flex items-center justify-between">
                        <QtyStepper
                          value={item.quantity}
                          disabled={isMutating || isRemoving}
                          onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                          onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                          onRemove={() => handleRemove(item.id)}
                        />
                        <span className="text-xs text-gray-400">
                          Total:{" "}
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(price * item.quantity)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Sidebar ── */}
          <div className="h-fit space-y-4 lg:sticky lg:top-6">
            {/* Coupon */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              {coupon ? (
                <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <Tag size={14} />
                    {coupon.code} applied
                  </span>
                  <button
                    onClick={() => setCoupon(null)}
                    aria-label="Remove coupon"
                    className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border px-3 focus-within:border-brand">
                    <Tag size={14} className="shrink-0 text-gray-400" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="w-full py-2.5 text-sm uppercase outline-none placeholder:normal-case"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isApplyingCoupon || !couponInput.trim()}
                    className="rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                  >
                    {isApplyingCoupon ? "..." : "Apply"}
                  </button>
                </form>
              )}
              {couponError && (
                <p className="mt-2 text-xs text-red-500">{couponError}</p>
              )}
            </div>

            {/* Price details */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-gray-800">Price Details</h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Price ({items.length} items)</span>
                  <span>{formatCurrency(mrpTotal)}</span>
                </div>
                <div className="flex justify-between font-medium text-green-600">
                  <span>Discount</span>
                  <span>− {formatCurrency(mrpTotal - subtotal)}</span>
                </div>
                {coupon && couponDiscount > 0 && (
                  <div className="flex justify-between font-medium text-green-600">
                    <span>Coupon ({coupon.code})</span>
                    <span>− {formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-semibold text-green-600">FREE</span>
                  ) : (
                    <span>{formatCurrency(shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-3 text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {mrpTotal - subtotal > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
                  <span>🎉</span>
                  <span>
                    You save{" "}
                    <strong>
                      {formatCurrency(mrpTotal - subtotal + couponDiscount)}
                    </strong>{" "}
                    on this order!
                  </span>
                </div>
              )}

              <Link
                href={isAuthenticated ? "/checkout" : "/login?redirect=/checkout"}
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-center font-bold text-white shadow-md shadow-brand/30 transition hover:bg-brand-dark active:scale-95"
              >
                Proceed to Checkout →
              </Link>

              {!isAuthenticated && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  You&apos;ll be asked to login at checkout.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
