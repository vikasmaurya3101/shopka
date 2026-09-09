"use client";

import { useState } from "react";
import { ListFilter, X } from "lucide-react";
import { ProductFilters, ProductSort } from "@/types/product";

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "popular", label: "Popularity" },
  { value: "latest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "discount", label: "Discount" },
];

const PRICE_PRESETS: { label: string; minPrice?: number; maxPrice?: number }[] = [
  { label: "Under ₹299", maxPrice: 299 },
  { label: "₹299 - ₹599", minPrice: 299, maxPrice: 599 },
  { label: "₹599 - ₹999", minPrice: 599, maxPrice: 999 },
  { label: "Above ₹999", minPrice: 999 },
];

export type QuickFilters = Pick<
  ProductFilters,
  "sort" | "minPrice" | "maxPrice" | "inStock"
>;

interface ProductFiltersBarProps {
  value: QuickFilters;
  onChange: (next: QuickFilters) => void;
  resultCount?: number;
}

/**
 * Sort + price + availability toolbar shared by category and search pages.
 * Purely client-side state — every option here maps to a filter the
 * `/api/products` endpoint already accepts, so no backend changes needed.
 */
export default function ProductFiltersBar({
  value,
  onChange,
  resultCount,
}: ProductFiltersBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const activePricePreset = PRICE_PRESETS.find(
    (p) => p.minPrice === value.minPrice && p.maxPrice === value.maxPrice
  );

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (activePricePreset) {
    activeChips.push({
      key: "price",
      label: activePricePreset.label,
      clear: () => onChange({ ...value, minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (value.inStock) {
    activeChips.push({
      key: "stock",
      label: "In Stock Only",
      clear: () => onChange({ ...value, inStock: undefined }),
    });
  }

  function togglePricePreset(preset: (typeof PRICE_PRESETS)[number]) {
    const isActive =
      preset.minPrice === value.minPrice && preset.maxPrice === value.maxPrice;
    onChange({
      ...value,
      minPrice: isActive ? undefined : preset.minPrice,
      maxPrice: isActive ? undefined : preset.maxPrice,
    });
  }

  const FilterOptions = (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Price
        </p>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((preset) => {
            const active =
              preset.minPrice === value.minPrice && preset.maxPrice === value.maxPrice;
            return (
              <button
                key={preset.label}
                onClick={() => togglePricePreset(preset)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Availability
        </p>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(value.inStock)}
            onChange={(e) => onChange({ ...value, inStock: e.target.checked || undefined })}
            className="h-4 w-4 rounded border-gray-300 accent-brand"
          />
          In Stock Only
        </label>
      </div>
    </div>
  );

  return (
    <div className="mb-4 border-b border-gray-100 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {resultCount !== undefined ? `${resultCount} products found` : ""}
        </p>

        <div className="flex items-center gap-2">
          {/* Filter trigger — bottom sheet on mobile, inline popover-less panel on desktop */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand hover:text-brand sm:hidden"
          >
            <ListFilter size={15} />
            Filter
          </button>

          <select
            value={value.sort ?? "popular"}
            onChange={(e) => onChange({ ...value, sort: e.target.value as ProductSort })}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-brand"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop: filters shown inline */}
      <div className="mt-4 hidden sm:block">{FilterOptions}</div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.clear}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand"
            >
              {chip.label}
              <X size={12} />
            </button>
          ))}
          <button
            onClick={() => onChange({ sort: value.sort })}
            className="text-xs font-semibold text-gray-400 underline-offset-2 hover:text-brand hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[999] sm:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Filters</h3>
              <button onClick={() => setSheetOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
            </div>

            {FilterOptions}

            <button
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full rounded-xl bg-brand py-3 font-semibold text-white"
            >
              Show Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
