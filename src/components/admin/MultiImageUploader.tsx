"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Star, Trash2, UploadCloud } from "lucide-react";

export interface ProductImageDraft {
  url: string;
  altText?: string;
  isThumbnail: boolean;
  displayOrder: number;
}

interface MultiImageUploaderProps {
  value: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
}

/**
 * Handles the full "upload -> preview -> order -> publish" flow for
 * product images:
 *  1. Pick multiple files at once
 *  2. Each is uploaded to Cloudinary via /api/admin/upload-image (already
 *     existing route — unchanged) in parallel, with a per-image spinner
 *  3. Uploaded images show as a reorderable, removable preview grid
 *  4. One image is marked as the thumbnail (used as the main product image)
 *  5. The parent form sends this whole array as `images` on submit — Prisma
 *     writes the ProductImage rows to the Supabase-hosted Postgres DB
 */
export default function MultiImageUploader({ value, onChange }: MultiImageUploaderProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploadingCount(files.length);

    const results = await Promise.allSettled(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!json.url) throw new Error("Upload failed");
        return json.url as string;
      })
    );

    const uploaded: ProductImageDraft[] = [];
    let failCount = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        uploaded.push({
          url: r.value,
          isThumbnail: false,
          displayOrder: 0, // recalculated below
        });
      } else {
        failCount++;
      }
    });

    if (failCount > 0) {
      toast.error(`${failCount} image${failCount > 1 ? "s" : ""} failed to upload.`);
    }

    if (uploaded.length > 0) {
      const merged = [...value, ...uploaded].map((img, i) => ({
        ...img,
        displayOrder: i,
        // First image ever added becomes the thumbnail by default
        isThumbnail: value.length === 0 && i === 0 ? true : img.isThumbnail,
      }));
      onChange(merged);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded.`);
    }

    setUploadingCount(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function setThumbnail(index: number) {
    onChange(value.map((img, i) => ({ ...img, isThumbnail: i === index })));
  }

  function removeImage(index: number) {
    const wasThumbnail = value[index]?.isThumbnail;
    const next = value
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, displayOrder: i }));
    // If we just removed the thumbnail, promote the new first image
    if (wasThumbnail && next.length > 0) next[0].isThumbnail = true;
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((img, i) => ({ ...img, displayOrder: i })));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Product Images
      </label>

      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {value.map((img, index) => (
            <div
              key={img.url + index}
              className={`group relative overflow-hidden rounded-lg border-2 bg-gray-50 ${
                img.isThumbnail ? "border-brand" : "border-gray-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.altText || `Product image ${index + 1}`}
                className="aspect-square w-full object-contain p-1"
              />

              {img.isThumbnail && (
                <span className="absolute left-1 top-1 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star size={10} className="fill-white" />
                  Main
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    aria-label="Move left"
                    title="Move earlier"
                  >
                    <GripVertical size={13} />
                  </button>
                  {!img.isThumbnail && (
                    <button
                      type="button"
                      onClick={() => setThumbnail(index)}
                      className="rounded p-1 text-white hover:bg-white/20"
                      aria-label="Set as main image"
                      title="Set as main image"
                    >
                      <Star size={13} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="rounded p-1 text-white hover:bg-red-500"
                  aria-label="Remove image"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <span className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 text-[10px] font-semibold text-white">
                {index + 1}
              </span>
            </div>
          ))}

          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="flex aspect-square animate-pulse items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50"
            >
              <UploadCloud size={20} className="text-gray-300" />
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center transition hover:border-brand hover:bg-brand-50">
        <UploadCloud size={22} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-600">
          {uploadingCount > 0
            ? `Uploading ${uploadingCount} image${uploadingCount > 1 ? "s" : ""}...`
            : "Click to upload one or more images"}
        </span>
        <span className="text-xs text-gray-400">JPEG, PNG or WebP — up to 5MB each</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          disabled={uploadingCount > 0}
          className="hidden"
        />
      </label>

      {value.length > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          Hover an image to reorder, set it as the main photo, or remove it.
          The star-marked photo is what shows first on the product page and
          in search results.
        </p>
      )}
    </div>
  );
}
