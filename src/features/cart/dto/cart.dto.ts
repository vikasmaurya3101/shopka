import { z } from "zod";

export const AddCartItemDto = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
});

export type AddCartItemDtoType = z.infer<typeof AddCartItemDto>;

export const UpdateCartItemDto = z.object({
  quantity: z.coerce.number().int().min(1).max(50),
});

export type UpdateCartItemDtoType = z.infer<typeof UpdateCartItemDto>;
