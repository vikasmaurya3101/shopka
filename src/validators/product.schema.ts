import { z } from "zod";

// Re-export the canonical product DTOs so route handlers and forms
// can import from a single top-level path.
export { CreateProductDto } from "@/features/products/dto/create-product.dto";
export { UpdateProductDto } from "@/features/products/dto/update-product.dto";
export { ProductQueryDto } from "@/features/products/dto/product-query.dto";

export const ProductReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  comment: z.string().trim().max(2000).optional(),
});

export type ProductReviewInput = z.infer<typeof ProductReviewSchema>;
