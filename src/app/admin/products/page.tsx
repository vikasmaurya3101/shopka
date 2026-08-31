"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import Loader from "@/components/ui/Loader";

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  mrp: number;
  stock: number;
  /** Decimal over the wire: a string. 0 = free delivery. */
  shippingCharge: number | string;
  isPublished: boolean;
  images: { url: string; isThumbnail?: boolean }[];
  category: { id: string; name: string };
  subCategory: { id: string; name: string } | null;
}

interface ListResponse {
  data: AdminProduct[];
  total: number;
  page: number;
  totalPages: number;
}

interface CategoryOption {
  id: string;
  name: string;
  subCategories: { id: string; name: string }[];
}

interface DeliveryChargeCellProps {
  productId: string;
  value: number | string;
  /** Applies a charge to the parent's row state — used for both the optimistic
   *  write and the revert if the request fails. */
  onApply: (productId: string, charge: number) => void;
}

/**
 * Inline rupee delivery charge. Saves on blur or Enter through the same
 * `PATCH /api/products/[id]` the edit form uses, so there's one code path and one
 * set of validation rules. 0 means free delivery.
 */
function DeliveryChargeCell({
  productId,
  value,
  onApply,
}: DeliveryChargeCellProps) {
  const [draft, setDraft] = useState(String(Number(value) || 0));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const previous = Number(value) || 0;
    const charge = Number(draft);

    if (draft.trim() === "" || !Number.isFinite(charge) || charge < 0) {
      toast.error("Delivery charge must be 0 or more.");
      setDraft(String(previous));
      return;
    }

    // Normalises "50.00" back to "50" as well as short-circuiting a no-op save.
    if (charge === previous) {
      setDraft(String(previous));
      return;
    }

    setIsSaving(true);
    setDraft(String(charge));
    onApply(productId, charge);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCharge: charge }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Unable to save delivery charge.");
        onApply(productId, previous);
        setDraft(String(previous));
        return;
      }

      toast.success(
        charge === 0
          ? "Delivery set to free."
          : `Delivery charge set to ₹${charge}.`
      );
    } catch {
      toast.error("Unable to save delivery charge.");
      onApply(productId, previous);
      setDraft(String(previous));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">₹</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={draft}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(String(Number(value) || 0));
            e.currentTarget.blur();
          }
        }}
        aria-label={`Delivery charge in rupees`}
        className="w-20 rounded-lg border px-2 py-1 text-sm outline-none focus:border-brand disabled:opacity-50"
      />
      {Number(value) === 0 && !isSaving && (
        <span className="text-xs font-medium text-success">Free</span>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  const { user, isAuthenticated, isLoading: isSessionLoading } = useSession();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<
    "publish" | "unpublish" | "delete" | "reassign" | ""
  >("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignCategoryId, setReassignCategoryId] = useState("");
  const [reassignSubCategoryId, setReassignSubCategoryId] = useState("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const isAuthorized =
    isAuthenticated && (user?.role === "ADMIN" || user?.role === "SELLER");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        const data: ListResponse = json.data;
        setProducts(data.data);
        setTotalPages(data.totalPages);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/admin/catalog/categories");
    const json = await res.json();
    if (json.success) {
      const cats = json.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        subCategories: c.subCategories || [],
      }));
      setCategories(cats);
      if (cats.length > 0) setReassignCategoryId(cats[0].id);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      loadProducts();
      loadCategories();
    }
  }, [isAuthorized, loadProducts, loadCategories]);

  function applyShippingCharge(productId: string, charge: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, shippingCharge: charge } : p
      )
    );
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;

    setDeletingId(id);

    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Unable to delete product.");
        return;
      }

      toast.success("Product deleted.");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function executeBulkAction(action: "publish" | "unpublish" | "delete") {
    if (selected.size === 0) return toast.error("No products selected.");

    const confirmMsg =
      action === "delete"
        ? `Delete ${selected.size} product(s)? This can't be undone.`
        : `${action === "publish" ? "Publish" : "Unpublish"} ${selected.size} product(s)?`;

    if (!confirm(confirmMsg)) return;

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selected) }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Bulk action failed.");
        return;
      }

      toast.success(json.message ?? "Bulk action completed.");
      setSelected(new Set());
      setBulkAction("");
      loadProducts();
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function executeBulkReassign() {
    if (selected.size === 0) return toast.error("No products selected.");
    if (!reassignCategoryId) return toast.error("Pick a category.");

    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reassign",
          ids: Array.from(selected),
          categoryId: reassignCategoryId,
          subCategoryId: reassignSubCategoryId || null,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Bulk reassign failed.");
        return;
      }

      toast.success(json.message ?? "Products reassigned.");
      setSelected(new Set());
      setBulkAction("");
      setShowReassignModal(false);
      loadProducts();
    } finally {
      setIsBulkProcessing(false);
    }
  }

  if (isSessionLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">
          You don&apos;t have access to this page.
        </p>
      </main>
    );
  }

  const availableSubs =
    categories.find((c) => c.id === reassignCategoryId)?.subCategories || [];

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            Manage Products
          </h1>
          <div className="flex gap-2">
            <Link
              href="/admin/products/bulk-import"
              className="rounded-xl border-2 border-brand px-4 py-2 font-semibold text-brand transition hover:bg-brand-50"
            >
              Bulk Import (CSV)
            </Link>
            <Link
              href="/admin/products/new"
              className="rounded-xl bg-brand px-4 py-2 font-semibold text-white transition hover:opacity-90"
            >
              + Add Product
            </Link>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products..."
          className="mb-4 w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
        />

        {isLoading ? (
          <Loader size="lg" />
        ) : products.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="p-3">
                      <input
                        type="checkbox"
                        checked={
                          products.length > 0 && selected.size === products.length
                        }
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Delivery</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const thumb =
                      p.images.find((img) => img.isThumbnail)?.url ??
                      p.images[0]?.url;

                    return (
                      <tr
                        key={p.id}
                        className={`border-t transition ${
                          selected.has(p.id) ? "bg-brand-50" : ""
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="flex items-center gap-3 p-3">
                          {thumb && (
                            <Image
                              src={thumb}
                              alt={p.name}
                              width={40}
                              height={40}
                              className="rounded-md object-cover"
                            />
                          )}
                          <span className="font-medium text-gray-800">
                            {p.name}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">
                              {p.category.name}
                            </div>
                            {p.subCategory && (
                              <div className="text-xs text-gray-400">
                                {p.subCategory.name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          ₹{p.sellingPrice}{" "}
                          <span className="text-gray-400 line-through">
                            ₹{p.mrp}
                          </span>
                        </td>
                        <td className="p-3">
                          <DeliveryChargeCell
                            productId={p.id}
                            value={p.shippingCharge}
                            onApply={applyShippingCharge}
                          />
                        </td>
                        <td className="p-3">{p.stock}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              p.isPublished
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {p.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="mr-3 font-medium text-brand hover:underline"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            className="font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === p.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-white px-6 py-3 shadow-2xl">
          <span className="text-sm font-medium text-gray-700">
            {selected.size} selected
          </span>
          <div className="h-6 w-px bg-gray-300" />
          <select
            value={bulkAction}
            onChange={(e) => {
              const val = e.target.value as typeof bulkAction;
              setBulkAction(val);
              if (val === "reassign") {
                setShowReassignModal(true);
              } else if (val) {
                executeBulkAction(val);
              }
            }}
            disabled={isBulkProcessing}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Choose action…</option>
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish</option>
            <option value="reassign">Reassign Category</option>
            <option value="delete">Delete</option>
          </select>
          <button
            onClick={() => {
              setSelected(new Set());
              setBulkAction("");
            }}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
      )}

      {/* Reassign modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Reassign {selected.size} Product(s)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={reassignCategoryId}
                  onChange={(e) => {
                    setReassignCategoryId(e.target.value);
                    setReassignSubCategoryId("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subcategory (optional)
                </label>
                <select
                  value={reassignSubCategoryId}
                  onChange={(e) => setReassignSubCategoryId(e.target.value)}
                  disabled={availableSubs.length === 0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
                >
                  <option value="">— None —</option>
                  {availableSubs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={executeBulkReassign}
                  disabled={isBulkProcessing}
                  className="flex-1 rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {isBulkProcessing ? "Saving…" : "Reassign"}
                </button>
                <button
                  onClick={() => {
                    setShowReassignModal(false);
                    setBulkAction("");
                  }}
                  disabled={isBulkProcessing}
                  className="rounded-lg border px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

