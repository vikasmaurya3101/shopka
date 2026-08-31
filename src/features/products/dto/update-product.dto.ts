import { z } from "zod";

export const UpdateProductDto = z.object({
  name: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .optional(),

  slug: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .optional(),

  description: z
    .string()
    .min(10)
    .optional(),

  shortDescription: z
    .string()
    .max(500)
    .optional(),

  sku: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .optional(),

  categoryId: z
    .string()
    .cuid()
    .optional(),

  subCategoryId: z
    .string()
    .cuid()
    .nullable()
    .optional(),

  brandId: z
    .string()
    .cuid()
    .nullable()
    .optional(),

  sellerId: z
    .string()
    .cuid()
    .nullable()
    .optional(),

  mrp: z.coerce
    .number()
    .positive()
    .optional(),

  sellingPrice: z.coerce
    .number()
    .positive()
    .optional(),

  taxPercent: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional(),

  stock: z.coerce
    .number()
    .int()
    .min(0)
    .optional(),

  minOrderQuantity: z.coerce
    .number()
    .int()
    .min(1)
    .optional(),

  isFeatured: z
    .boolean()
    .optional(),

  isTrending: z
    .boolean()
    .optional(),

  isBestSeller: z
    .boolean()
    .optional(),

  isNewArrival: z
    .boolean()
    .optional(),

  isPublished: z
    .boolean()
    .optional(),

  /** Rupee delivery charge for this product. 0 = free delivery. */
  shippingCharge: z.coerce
    .number()
    .min(0)
    .optional(),

  codAllowed: z
    .boolean()
    .optional(),

  estimatedDeliveryDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .optional(),

  seoTitle: z
    .string()
    .max(255)
    .nullable()
    .optional(),

  seoDescription: z
    .string()
    .max(500)
    .nullable()
    .optional(),

  searchKeywords: z
    .string()
    .nullable()
    .optional(),

  images: z
    .array(
      z.object({
        id: z.string().cuid().optional(),
        url: z.string().url(),
        altText: z.string().optional(),
        isThumbnail: z.boolean().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .optional(),
});

export type UpdateProductDtoType = z.infer<typeof UpdateProductDto>;