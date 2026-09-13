"use client";

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { useWishlist } from "@/hooks/useWishlist";
import ProductCard from "@/components/product/ProductCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import Breadcrumbs from "@/components/shared/Breadcrumbs";

export default function WishlistPage() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const { wishlist, isLoading } = useWishlist();

  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
          <Heart size={32} className="text-brand" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Login to view your wishlist</h1>
        <p className="max-w-xs text-sm text-gray-500">
          Save items you love here so you never lose track of them.
        </p>
        <Link
          href="/login?redirect=/wishlist"
          className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
        >
          Login
        </Link>
      </main>
    );
  }

  const items = wishlist?.items ?? [];

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} className="mb-4" />

        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
            My Wishlist {items.length > 0 && <span className="text-gray-400">({items.length})</span>}
          </h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <Heart size={28} className="text-brand" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700">Your wishlist is empty</h2>
            <p className="max-w-xs text-sm text-gray-500">
              Tap the heart icon on any product to save it here for later.
            </p>
            <Link
              href="/"
              className="mt-2 flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
            >
              <ShoppingBag size={18} />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            {items.map((item) => (
              <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
