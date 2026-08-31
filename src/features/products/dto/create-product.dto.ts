import { z } from "zod";

export const CreateProductDto = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(255),

  slug: z
    .string()
    .trim()
    .min(3)
    .max(255),

  description: z
    .string()
    .min(10),

  shortDescription: z
    .string()
    .max(500)
    .optional(),

  sku: z
    .string()
    .trim()
    .min(3)
    .max(100),

  categoryId: z.string().cuid(),

  subCategoryId: z
    .string()
    .cuid()
    .optional(),

  brandId: z
    .string()
    .cuid()
    .optional(),

  sellerId: z
    .string()
    .cuid()
    .optional(),

  mrp: z.coerce
    .number()
    .positive(),

  sellingPrice: z.coerce
    .number()
    .positive(),

  taxPercent: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(0),

  stock: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  minOrderQuantity: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  isFeatured: z
    .boolean()
    .default(false),

  isTrending: z
    .boolean()
    .default(false),

  isBestSeller: z
    .boolean()
    .default(false),

  isNewArrival: z
    .boolean()
    .default(false),

  isPublished: z
    .boolean()
    .default(false),

  /** Rupee delivery charge for this product. 0 = free delivery. */
  shippingCharge: z.coerce
    .number()
    .min(0)
    .default(0),

  codAllowed: z
    .boolean()
    .default(true),

  estimatedDeliveryDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(5),

  seoTitle: z
    .string()
    .max(255)
    .optional(),

  seoDescription: z
    .string()
    .max(500)
    .optional(),

  searchKeywords: z
    .string()
    .optional(),

  images: z
    .array(
      z.object({
        url: z.string().url(),

        altText: z
          .string()
          .optional(),

        isThumbnail: z
          .boolean()
          .optional(),

        displayOrder: z
          .number()
          .optional(),
      })
    )
    .default([]),
});

export type CreateProductDtoType =
  z.infer<typeof CreateProductDto>;