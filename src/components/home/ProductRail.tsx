"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCardData } from "@/types/product";
import ProductCard from "@/components/product/ProductCard";

interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  viewAllHref?: string;
}

export default function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
}: ProductRailProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });

  // Embla owns its own scroll state internally and mutates it outside of
  // React (drag, arrow clicks, resize). This counter just forces a
  // re-render on its "select"/"reInit" events so canScrollPrev/Next below
  // are always read fresh from the API, rather than mirroring them into
  // separate React state.
  const [, notifyChange] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on("select", notifyChange);
    emblaApi.on("reInit", notifyChange);

    return () => {
      emblaApi.off("select", notifyChange);
      emblaApi.off("reInit", notifyChange);
    };
  }, [emblaApi]);

  if (products.length === 0) return null;

  const canScrollPrev = emblaApi?.canScrollPrev() ?? false;
  const canScrollNext = emblaApi?.canScrollNext() ?? false;
  const showArrows = canScrollPrev || canScrollNext;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-sm font-semibold text-brand hover:underline"
            >
              View all
            </Link>
          )}

          {showArrows && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => emblaApi?.scrollPrev()}
                disabled={!canScrollPrev}
                aria-label={`Scroll ${title} left`}
                className="tap-shrink flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => emblaApi?.scrollNext()}
                disabled={!canScrollNext}
                aria-label={`Scroll ${title} right`}
                className="tap-shrink flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 py-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-0 flex-[0_0_50%] sm:flex-[0_0_33.333%] md:flex-[0_0_25%] lg:flex-[0_0_20%]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
