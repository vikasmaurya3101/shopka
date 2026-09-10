"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, Share2, Sparkles } from "lucide-react";
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

  const wishlisted = isWishlisted(productId);

  async function handleShare() {
    const url = `${window.location.origin}/product/${productSlug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Product link copied to clipboard");
  }

  async function handleAddToCart() {
    await addToCart(productId, quantity);
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

  const primaryActionsProps = {
    inStock,
    isMutating,
    isBuyingNow,
    onAddToCart: handleAddToCart,
    onBuyNow: handleBuyNow,
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {inStock && (
            <div className="flex items-center rounded-lg border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-gray-50"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="p-3 hover:bg-gray-50"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <WishlistButton wishlisted={wishlisted} onClick={() => toggleWishlist(productId)} />
          <ShareButton onClick={handleShare} />
        </div>

        {/* Inline CTAs — desktop only; the sticky bar below takes over on mobile. */}
        <div className="hidden gap-3 sm:flex">
          <PrimaryActions {...primaryActionsProps} />
        </div>
      </div>

      {/* Sticky mobile Add to Cart / Buy Now bar. Fixed positioning is safe
          here since no ancestor of ProductActions sets a transform/filter
          that would create a new containing block, so no portal is needed. */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex gap-3 border-t border-gray-100 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <PrimaryActions {...primaryActionsProps} />
      </div>
    </>
  );
}

function PrimaryActions({
  inStock,
  isMutating,
  isBuyingNow,
  onAddToCart,
  onBuyNow,
}: {
  inStock: boolean;
  isMutating: boolean;
  isBuyingNow: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}) {
  if (!inStock) {
    return (
      <button
        disabled
        className="flex-1 rounded-xl bg-gray-300 py-3 font-semibold text-gray-600 sm:flex-none sm:px-10"
      >
        Out of Stock
      </button>
    );
  }

  return (
    <>
      <button
        onClick={onAddToCart}
        disabled={isMutating || isBuyingNow}
        className="flex-1 rounded-xl border-2 border-brand py-3 font-semibold text-brand transition active:scale-[0.98] hover:bg-brand-50 disabled:opacity-60"
      >
        {isMutating ? "Adding..." : "Add to Cart"}
      </button>

      <button
        onClick={onBuyNow}
        disabled={isMutating || isBuyingNow}
        className="brand-glow group relative flex-1 overflow-hidden rounded-xl bg-brand py-3 font-bold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] hover:bg-brand-dark disabled:opacity-60"
      >
        {/* Shine sweep — purely decorative, loops on its own */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:animate-[shimmer_1.1s_ease-in-out]" />
        <span className="relative flex items-center justify-center gap-1.5">
          <Sparkles size={16} className="fill-gold text-gold" />
          {isBuyingNow ? "Please wait..." : "Buy Now"}
        </span>
      </button>
    </>
  );
}

function WishlistButton({
  wishlisted,
  onClick,
}: {
  wishlisted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap-shrink rounded-full border p-3 transition hover:scale-110 ${
        wishlisted ? "border-brand bg-brand-50" : "border-gray-200 hover:bg-gray-50"
      }`}
      aria-label="Toggle wishlist"
    >
      <Heart
        size={20}
        className={wishlisted ? "fill-brand text-brand" : "text-gray-500"}
      />
    </button>
  );
}

function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap-shrink rounded-full border border-gray-200 p-3 transition hover:scale-110 hover:bg-gray-50"
      aria-label="Share product"
    >
      <Share2 size={20} className="text-gray-500" />
    </button>
  );
}
