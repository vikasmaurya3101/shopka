"use client";

import { useMemo, useState } from "react";
import { useInfiniteProducts } from "@/hooks/useInfiniteProducts";
import { ProductFilters } from "@/types/product";
import ProductGrid from "./ProductGrid";
import ProductFiltersBar, { QuickFilters } from "./ProductFiltersBar";
import EmptyState from "@/components/shared/EmptyState";
import SkeletonCard from "@/components/shared/SkeletonCard";

export default function ProductListClient({
  filters,
}: {
  filters: ProductFilters;
}) {
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({});

  const combinedFilters = useMemo(
    () => ({ ...filters, ...quickFilters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters), JSON.stringify(quickFilters)]
  );

  const { products, isLoading, isLoadingMore, hasNext, loadMore, total } =
    useInfiniteProducts(combinedFilters);

  return (
    <div>
      <ProductFiltersBar
        value={quickFilters}
        onChange={setQuickFilters}
        resultCount={isLoading ? undefined : total}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products match these filters"
          description="Try clearing a filter or choosing a broader price range."
        />
      ) : (
        <>
          <ProductGrid products={products} />

          {hasNext && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="rounded-full border-2 border-brand px-8 py-2.5 font-semibold text-brand transition hover:bg-brand-50 disabled:opacity-60"
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
