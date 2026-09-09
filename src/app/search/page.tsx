"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import ProductListClient from "@/components/product/ProductListClient";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  // Sort, price, and stock filters are handled inside ProductListClient's
  // own toolbar (ProductFiltersBar) — kept out of the URL here so search and
  // category pages share one consistent filter UI instead of two different ones.
  const filters = useMemo(
    () => ({
      search: query || undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      brandId: searchParams.get("brandId") ?? undefined,
      featured: searchParams.get("featured") === "true" || undefined,
      trending: searchParams.get("trending") === "true" || undefined,
      bestSeller: searchParams.get("bestSeller") === "true" || undefined,
      newArrival: searchParams.get("newArrival") === "true" || undefined,
    }),
    [query, searchParams]
  );

  return (
    <main className="min-h-screen bg-white p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-lg font-semibold text-gray-800">
          {query ? (
            <>
              Results for <span className="text-brand">&quot;{query}&quot;</span>
            </>
          ) : (
            "All Products"
          )}
        </h1>

        <ProductListClient filters={filters} />
      </div>
    </main>
  );
}
