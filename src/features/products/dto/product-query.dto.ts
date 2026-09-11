import { z } from "zod";

export const ProductQueryDto = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z
    .string()
    .trim()
    .optional(),

  categoryId: z
    .string()
    .min(1)
    .optional(),

  subCategoryId: z
    .string()
    .min(1)
    .optional(),

  brandId: z
    .string()
    .min(1)
    .optional(),

  sellerId: z
    .string()
    .min(1)
    .optional(),

  minPrice: z.coerce
    .number()
    .min(0)
    .optional(),

  maxPrice: z.coerce
    .number()
    .min(0)
    .optional(),

  featured: z
    .coerce
    .boolean()
    .optional(),

  trending: z
    .coerce
    .boolean()
    .optional(),

  bestSeller: z
    .coerce
    .boolean()
    .optional(),

  newArrival: z
    .coerce
    .boolean()
    .optional(),

  inStock: z
    .coerce
    .boolean()
    .optional(),

  sort: z
    .enum([
      "latest",
      "oldest",
      "price_low",
      "price_high",
      "rating",
      "discount",
      "popular",
    ])
    .default("latest"),
})
.refine(
  (data) => {
    if (
      data.minPrice !== undefined &&
      data.maxPrice !== undefined
    ) {
      return data.minPrice <= data.maxPrice;
    }

    return true;
  },
  {
    message:
      "minPrice cannot be greater than maxPrice",
    path: ["minPrice"],
  }
);

export type ProductQueryDtoType =
  z.infer<typeof ProductQueryDto>;