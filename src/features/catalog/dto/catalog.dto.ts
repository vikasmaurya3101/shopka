import { z } from "zod";

export const CreateCategoryDto = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  image: z.string().trim().url().optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});
export type CreateCategoryDtoType = z.infer<typeof CreateCategoryDto>;

export const UpdateCategoryDto = CreateCategoryDto.partial();
export type UpdateCategoryDtoType = z.infer<typeof UpdateCategoryDto>;

export const CreateSubCategoryDto = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  categoryId: z.string().min(1),
  image: z.string().trim().url().optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
});
export type CreateSubCategoryDtoType = z.infer<typeof CreateSubCategoryDto>;

export const UpdateSubCategoryDto = CreateSubCategoryDto.partial();
export type UpdateSubCategoryDtoType = z.infer<typeof UpdateSubCategoryDto>;

export const CreateBrandDto = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  logo: z.string().trim().url().optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});
export type CreateBrandDtoType = z.infer<typeof CreateBrandDto>;

export const UpdateBrandDto = CreateBrandDto.partial();
export type UpdateBrandDtoType = z.infer<typeof UpdateBrandDto>;
