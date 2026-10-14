import { z } from "zod";

export const productIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const productStoreIdParamsSchema = z.object({
  storeId: z.string().min(1),
});

export const productCategoryIdParamsSchema = z.object({
  categoryId: z.string().min(1),
});

export const createProductSchema = z.object({
  category_id: z.string().min(1),
  name: z.string().trim().min(1).max(150),
  description: z.string().nullable().optional(),
  price: z.number().finite().positive(),
});

export const updateProductSchema = z
  .object({
    category_id: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(150).optional(),
    description: z.string().nullable().optional(),
    price: z.number().finite().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const setProductAvailabilitySchema = z.object({
  availability: z.enum(["available", "unavailable"]),
});

export type ProductIdParams = z.infer<
  typeof productIdParamsSchema
>;

export type ProductStoreIdParams = z.infer<
  typeof productStoreIdParamsSchema
>;

export type ProductCategoryIdParams = z.infer<
  typeof productCategoryIdParamsSchema
>;

export type CreateProductBody = z.infer<
  typeof createProductSchema
>;

export type UpdateProductBody = z.infer<
  typeof updateProductSchema
>;

export type SetProductAvailabilityBody = z.infer<
  typeof setProductAvailabilitySchema
>;
