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

export default function CartPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const { cart, isLoading, isMutating, updateQuantity, removeItem } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

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
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <ShoppingBag size={32} className="text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Your cart is empty</h1>
        <p className="max-w-xs text-sm text-gray-500">
          Looks like you haven&apos;t added anything yet. Let&apos;s fix that.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
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

  // Delivery is the sum of the per-product charges (once each, whatever the
  // quantity). A FREE_SHIPPING coupon overrides the lot.
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

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 sm:text-3xl">
          My Cart ({items.length})
        </h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => {
              const thumbnail =
                item.product.images.find((img) => img.isThumbnail)?.url ??
                item.product.images[0]?.url ??
                "/placeholder-product.png";

              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border bg-white p-4 transition hover:border-brand-100"
                >
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-50"
                  >
                    <Image
                      src={thumbnail}
                      alt={item.product.name}
                      fill
                      sizes="96px"
                      className="object-contain p-1.5"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-brand"
                      >
                        {item.product.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.product.sellingPrice)}
                        </span>
                        {Number(item.product.mrp) > Number(item.product.sellingPrice) && (
                          <>
                            <span className="text-xs text-gray-400 line-through">
                              {formatCurrency(item.product.mrp)}
                            </span>
                            <span className="text-xs font-semibold text-success">
                              {Math.round(
                                ((Number(item.product.mrp) - Number(item.product.sellingPrice)) /
                                  Number(item.product.mrp)) *
                                  100
                              )}
                              % off
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-lg border">
                        <button
                          disabled={isMutating}
                          onClick={() =>
                            item.quantity > 1
                              ? updateQuantity(item.id, item.quantity - 1)
                              : removeItem(item.id)
                          }
                          className="p-2 hover:bg-gray-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          disabled={isMutating}
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="p-2 hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        disabled={isMutating}
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-fit space-y-4 lg:sticky lg:top-6">
            {/* Promo code */}
            <div className="rounded-xl border bg-white p-4">
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg bg-success-light px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-success">
                    <Tag size={15} />
                    {coupon.code} applied
                  </span>
                  <button
                    onClick={() => setCoupon(null)}
                    aria-label="Remove coupon"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border px-3 focus-within:border-brand">
                    <Tag size={15} className="text-gray-400" />
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
                    className="tap-shrink rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                  >
                    {isApplyingCoupon ? "..." : "Apply"}
                  </button>
                </form>
              )}
              {couponError && (
                <p className="mt-2 text-xs text-red-600">{couponError}</p>
              )}
            </div>

            {/* Price details */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-800">
                Price Details
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Price ({items.length} items)</span>
                  <span>{formatCurrency(mrpTotal)}</span>
                </div>
                <div className="flex justify-between text-brand">
                  <span>Discount</span>
                  <span>-{formatCurrency(mrpTotal - subtotal)}</span>
                </div>
                {coupon && couponDiscount > 0 && (
                  <div className="flex justify-between text-brand">
                    <span>Coupon ({coupon.code})</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-medium text-success">FREE</span>
                  ) : (
                    <span>{formatCurrency(shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Link
                href={isAuthenticated ? "/checkout" : "/login?redirect=/checkout"}
                className="mt-5 block rounded-xl bg-brand py-3 text-center font-semibold text-white transition hover:bg-brand-dark"
              >
                Proceed to Checkout
              </Link>

              {mrpTotal - subtotal > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-light px-3 py-2 text-sm font-medium text-success">
                  <span>✅</span>
                  <span>
                    Yay! You&apos;re saving {formatCurrency(mrpTotal - subtotal + couponDiscount)} on this order
                  </span>
                </div>
              )}

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
