"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import Loader from "@/components/ui/Loader";

interface Category {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isSessionLoading } = useSession();

  const isAuthorized =
    isAuthenticated && (user?.role === "ADMIN" || user?.role === "SELLER");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    subCategoryId: "",
    brandId: "",
    mrp: "",
    sellingPrice: "",
    stock: "",
    estimatedDeliveryDays: "5",
    shippingCharge: "0",
    imageUrl: "",
    isPublished: false,
    codAllowed: true,
  });

  useEffect(() => {
    if (!isAuthorized) return;

    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setNotFound(true);
          return;
        }

        const p = json.data;
        const thumb =
          p.images?.find((img: { isThumbnail?: boolean }) => img.isThumbnail)
            ?.url ?? p.images?.[0]?.url ?? "";

        setForm({
          name: p.name ?? "",
          description: p.description ?? "",
          categoryId: p.categoryId ?? "",
          subCategoryId: p.subCategoryId ?? "",
          brandId: p.brandId ?? "",
          mrp: String(p.mrp ?? ""),
          sellingPrice: String(p.sellingPrice ?? ""),
          stock: String(p.stock ?? "0"),
          estimatedDeliveryDays: String(p.estimatedDeliveryDays ?? 5),
          shippingCharge: String(p.shippingCharge ?? 0),
          imageUrl: thumb,
          isPublished: !!p.isPublished,
          codAllowed: p.codAllowed !== false,
        });
      })
      .finally(() => setIsLoading(false));

    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });

    fetch("/api/admin/catalog/subcategories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success)
          setSubCategories(
            json.data.map((s: { id: string; name: string; categoryId: string }) => ({
              id: s.id,
              name: s.name,
              categoryId: s.categoryId,
            }))
          );
      });

    fetch("/api/admin/catalog/brands")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBrands(json.data);
      });
  }, [id, isAuthorized]);

  const filteredSubCategories = subCategories.filter(
    (s) => s.categoryId === form.categoryId
  );

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!json.url) {
        toast.error("Upload failed. Try again.");
        return;
      }

      updateField("imageUrl", json.url);
      toast.success("Image uploaded.");
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          categoryId: form.categoryId || undefined,
          subCategoryId: form.subCategoryId || null,
          brandId: form.brandId || null,
          mrp: Number(form.mrp),
          sellingPrice: Number(form.sellingPrice),
          stock: Number(form.stock),
          estimatedDeliveryDays: Number(form.estimatedDeliveryDays) || 5,
          shippingCharge: Number(form.shippingCharge) || 0,
          isPublished: form.isPublished,
          codAllowed: form.codAllowed,
          images: form.imageUrl
            ? [{ url: form.imageUrl, isThumbnail: true, displayOrder: 0 }]
            : undefined,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Unable to update product.");
        return;
      }

      toast.success("Product updated.");
      router.push("/admin/products");
    } finally {
      setIsSaving(false);
    }
  }

  if (isSessionLoading || isLoading) {
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

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">Product not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-800 sm:text-3xl">
          Edit Product
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-white p-5"
        >
          {form.imageUrl && (
            <img
              src={form.imageUrl}
              alt="Preview"
              className="h-40 w-40 rounded-lg border object-cover"
            />
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            {isUploading && (
              <p className="mt-1 text-xs text-gray-500">Uploading...</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image URL (auto-filled after upload, or paste manually)
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                MRP
              </label>
              <input
                type="number"
                value={form.mrp}
                onChange={(e) => updateField("mrp", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Selling Price
              </label>
              <input
                type="number"
                value={form.sellingPrice}
                onChange={(e) => updateField("sellingPrice", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Stock
              </label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => updateField("stock", e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Estimated Delivery Days
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.estimatedDeliveryDays}
              onChange={(e) => updateField("estimatedDeliveryDays", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-xs text-gray-400">
              Number of days from order placement to estimated delivery. Shown to customers on order page.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Delivery Charge (₹)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.shippingCharge}
              onChange={(e) => updateField("shippingCharge", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave 0 for free delivery. Charged once per product in a cart,
              however many units the customer orders.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.codAllowed}
              onChange={(e) => updateField("codAllowed", e.target.checked)}
            />
            Cash on Delivery allowed
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => updateField("isPublished", e.target.checked)}
            />
            Published (visible to customers)
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </main>
  );
}
