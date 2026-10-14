import { z } from "zod";

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const categorySlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const createCategorySchema = z.object({
  parent_id: z.string().min(1).nullable().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const updateCategorySchema = z
  .object({
    parent_id: z.string().min(1).nullable().optional(),
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type CategoryIdParams = z.infer<
  typeof categoryIdParamsSchema
>;

export type CategorySlugParams = z.infer<
  typeof categorySlugParamsSchema
>;

export type CreateCategoryBody = z.infer<
  typeof createCategorySchema
>;

export type UpdateCategoryBody = z.infer<
  typeof updateCategorySchema
>;
