"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
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

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_32px_-12px_rgba(214,38,111,0.28)]">
      {discount > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
          {discount}% OFF
        </span>
      )}

      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product.id);
        }}
        className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow-sm transition hover:scale-110"
        aria-label="Toggle wishlist"
      >
        <Heart
          size={16}
          className={
            wishlisted ? "fill-brand text-brand" : "text-gray-400"
          }
        />
      </button>

      <Link href={`/product/${product.slug}`} className="block" prefetch={false}>
        <div className="relative aspect-square w-full bg-gradient-to-b from-brand-50/60 to-white">
          <Image
            src={thumbnail}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-contain p-3 transition group-hover:scale-105"
          />

          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="rounded bg-gray-800 px-2 py-1 text-xs font-semibold text-white">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {product.brand && (
            <span className="text-xs font-medium text-gray-400">
              {product.brand.name}
            </span>
          )}

          <h3 className="line-clamp-2 text-sm font-medium text-gray-800">
            {product.name}
          </h3>

          <ProductRating
            rating={product.avgRating}
            totalReviews={product.totalReviews}
            size={12}
          />

          <ProductPrice
            mrp={product.mrp}
            sellingPrice={product.sellingPrice}
            discountPercent={product.discountPercent}
            size="sm"
          />

          {Number(product.shippingCharge) === 0 && (
            <span className="text-xs font-medium text-success">
              Free Delivery
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={() => addToCart(product.id, 1)}
        disabled={product.stock === 0 || isMutating}
        className="m-3 mt-0 rounded-xl bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  );
}
