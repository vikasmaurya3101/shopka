"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, ShoppingCart, Star, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  id: string;
  name: string;
  slug: string;
  mrp: number | string;
  sellingPrice: number | string;
  discountPercent: number | string;
  avgRating: number | string;
  totalReviews: number;
  shippingCharge: number | string;
  images: { url: string; isThumbnail: boolean }[];
}

interface SimilarProductsProps {
  products: Product[];
}

function ProductCard({ product }: { product: Product }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);

  const mrp = Number(product.mrp);
  const price = Number(product.sellingPrice);
  const discount = Number(product.discountPercent);
  const rating = Number(product.avgRating);
  const isFreeShipping = Number(product.shippingCharge) === 0;
  const thumbnail = product.images.find((i) => i.isThumbnail)?.url ?? product.images[0]?.url;

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group w-40 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white transition hover:border-brand hover:shadow-sm"
    >
      {/* Image */}
      <div className="relative h-40 w-40 bg-gray-50">
        {discount > 0 && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
            {Math.round(discount)}% OFF
          </span>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWishlisted((v) => !v); }}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm"
        >
          <Heart size={14} className={wishlisted ? "fill-brand text-brand" : "text-gray-400"} />
        </button>
        {thumbnail ? (
          <Image src={thumbnail} alt={product.name} fill sizes="160px" className="object-contain p-2 transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-200">
            <ShoppingCart size={32} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-2.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-gray-800">{product.name}</p>

        {rating > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="flex items-center gap-0.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {rating.toFixed(1)} <Star size={8} className="fill-white" />
            </span>
            <span className="text-[10px] text-gray-400">({product.totalReviews})</span>
          </div>
        )}

        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-gray-900">{formatCurrency(price)}</span>
          {mrp > price && (
            <span className="text-[10px] text-gray-400 line-through">{formatCurrency(mrp)}</span>
          )}
        </div>

        {isFreeShipping && <p className="mt-0.5 text-[10px] font-medium text-green-600">Free delivery</p>}

        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-brand py-1.5 text-[11px] font-semibold text-brand hover:bg-brand-50 disabled:opacity-60"
        >
          <ShoppingCart size={11} />
          {adding ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </Link>
  );
}

export default function SimilarProducts({ products }: SimilarProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-800">
          <Star size={16} className="fill-amber-400 text-amber-400" /> Similar Products
        </h2>
        <Link href="/product" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          See all <ChevronRight size={14} />
        </Link>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
