"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Share2, ShoppingCart, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { useSession } from "@/providers/SessionProvider";

interface ProductActionsProps {
  productId: string;
  productName: string;
  productSlug: string;
  inStock: boolean;
}

export default function ProductActions({
  productId,
  productName,
  productSlug,
  inStock,
}: ProductActionsProps) {
  const router = useRouter();
  const { isAuthenticated } = useSession();
  const { addToCart, isMutating } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const wishlisted = isWishlisted(productId);

  async function handleShare() {
    const url = `${window.location.origin}/product/${productSlug}`;
    if (navigator.share) {
      try { await navigator.share({ title: productName, url }); } catch { /* cancelled */ }
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  async function handleAddToCart() {
    const ok = await addToCart(productId, quantity);
    if (ok) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    }
  }

  async function handleBuyNow() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/product/${productSlug}`);
      return;
    }
    setIsBuyingNow(true);
    try {
      const added = await addToCart(productId, quantity);
      if (added) router.push("/checkout");
    } finally {
      setIsBuyingNow(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Qty stepper + wishlist + share ── */}
        {inStock && (
          <div className="flex items-center gap-3">
            {/* Premium pill stepper */}
            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition hover:bg-brand hover:text-white active:scale-90 disabled:opacity-40"
              >
                <Minus size={15} />
              </button>
              <span className="w-9 text-center text-base font-bold text-gray-800">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm transition hover:bg-brand hover:text-white active:scale-90"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Wishlist */}
            <button
              onClick={() => toggleWishlist(productId)}
              aria-label="Toggle wishlist"
              className={`tap-shrink flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition hover:scale-110 active:scale-95 ${
                wishlisted
                  ? "border-brand bg-brand/5"
                  : "border-gray-200 bg-white hover:border-brand/40"
              }`}
            >
              <Heart
                size={20}
                className={wishlisted ? "fill-brand text-brand" : "text-gray-400"}
              />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              aria-label="Share product"
              className="tap-shrink flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-gray-200 bg-white transition hover:scale-110 hover:border-brand/40 active:scale-95"
            >
              <Share2 size={18} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* ── Desktop CTAs ── */}
        <div className="hidden gap-3 sm:flex">
          <CTAButtons
            inStock={inStock}
            isMutating={isMutating}
            isBuyingNow={isBuyingNow}
            justAdded={justAdded}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
          />
        </div>
      </div>

      {/* ── Mobile sticky bar ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-gray-100 bg-white/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.10)] backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "max(0.75rem,env(safe-area-inset-bottom))" }}
      >
        <CTAButtons
          inStock={inStock}
          isMutating={isMutating}
          isBuyingNow={isBuyingNow}
          justAdded={justAdded}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      </div>
    </>
  );
}

function CTAButtons({
  inStock,
  isMutating,
  isBuyingNow,
  justAdded,
  onAddToCart,
  onBuyNow,
}: {
  inStock: boolean;
  isMutating: boolean;
  isBuyingNow: boolean;
  justAdded: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  if (!inStock) {
    return (
      <button
        disabled
        className="flex-1 cursor-not-allowed rounded-2xl bg-gray-100 py-3.5 font-semibold text-gray-400"
      >
        Out of Stock
      </button>
    );
  }

  return (
    <>
      {/* Add to Cart */}
      <button
        onClick={onAddToCart}
        disabled={isMutating || isBuyingNow}
        className={`group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 py-3.5 font-bold transition active:scale-[0.97] disabled:opacity-60 ${
          justAdded
            ? "border-green-500 bg-green-50 text-green-600"
            : "border-brand bg-white text-brand hover:bg-brand-50"
        }`}
      >
        <ShoppingCart
          size={18}
          className={`transition-transform group-hover:-translate-y-0.5 ${
            justAdded ? "text-green-500" : "text-brand"
          }`}
        />
        <span className="text-sm">
          {isMutating ? "Adding…" : justAdded ? "Added ✓" : "Add to Cart"}
        </span>
      </button>

      {/* Buy Now */}
      <button
        onClick={onBuyNow}
        disabled={isMutating || isBuyingNow}
        className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-brand py-3.5 font-bold text-white shadow-lg shadow-brand/35 transition hover:bg-brand-dark active:scale-[0.97] disabled:opacity-60"
      >
        {/* Shimmer sweep */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="relative flex items-center gap-1.5 text-sm">
          {isBuyingNow ? (
            <><Zap size={16} className="animate-pulse" /> Please wait…</>
          ) : (
            <><Sparkles size={16} className="fill-yellow-300 text-yellow-300" /> Buy Now</>
          )}
        </span>
      </button>
    </>
  );
}
