"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Loader2, ShoppingCart, Truck } from "lucide-react";
import { ProductCardData } from "@/types/product";
import ProductPrice from "./ProductPrice";
import ProductRating from "./ProductRating";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";

interface ProductCardProps {
  product: ProductCardData;
}

export default function ProductCard({ product }: ProductCardProps) {
  const thumbnail =
    product.images.find((img) => img.isThumbnail)?.url ??
    product.images[0]?.url ??
    "/placeholder-product.png";

  const { addToCart, isMutating } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const discount = Math.round(Number(product.discountPercent) || 0);
  const outOfStock = product.stock === 0;

  // Local "just added" flash — separate from the hook's isMutating so the
  // checkmark only shows on the card that was actually clicked, not every
  // card mid-request.
  const [justAdded, setJustAdded] = useState(false);

  async function handleAddToCart() {
    await addToCart(product.id, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-100 hover:shadow-[0_16px_32px_-12px_rgba(214,38,111,0.28)]">
      {discount > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-brand px-2 py-1 text-[11px] font-bold leading-none text-white shadow-sm">
          {discount}% OFF
        </span>
      )}

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product.id);
        }}
        className="tap-shrink absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow-sm ring-1 ring-black/5 transition hover:scale-110"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={16}
          className={wishlisted ? "fill-brand text-brand" : "text-gray-400"}
        />
      </button>

      <Link href={`/product/${product.slug}`} className="block" prefetch={false}>
        <div className="relative aspect-square w-full bg-gradient-to-b from-brand-50/60 to-white">
          <Image
            src={thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
          />

          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
              <span className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-3 pt-3">
          {product.brand && (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {product.brand.name}
            </span>
          )}

          <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-tight text-gray-800">
            {product.name}
          </h3>

          <ProductRating
            rating={product.avgRating}
            totalReviews={product.totalReviews}
            size={12}
          />

          <div className="mt-0.5">
            <ProductPrice
              mrp={product.mrp}
              sellingPrice={product.sellingPrice}
              discountPercent={product.discountPercent}
              size="sm"
            />
          </div>

          {Number(product.shippingCharge) === 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <Truck size={12} />
              Free Delivery
            </span>
          )}
        </div>
      </Link>

      <div className="p-3 pt-2">
        <button
          onClick={handleAddToCart}
          disabled={outOfStock || isMutating}
          className={`tap-shrink flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            justAdded
              ? "bg-success text-white"
              : outOfStock
              ? "bg-gray-200 text-gray-400"
              : "bg-brand text-white hover:bg-brand-dark"
          }`}
        >
          {isMutating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : justAdded ? (
            "Added ✓"
          ) : outOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart size={15} />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
