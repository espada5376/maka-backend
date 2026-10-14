import { z } from "zod";

export const storeIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const storeOwnerIdParamsSchema = z.object({
  ownerId: z.string().min(1),
});

export const createStoreSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  country: z.string(),
  city: z.string(),
});

export const updateStoreSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type StoreIdParams = z.infer<typeof storeIdParamsSchema>;

export type StoreOwnerIdParams = z.infer<
  typeof storeOwnerIdParamsSchema
>;

export type CreateStoreBody = z.infer<
  typeof createStoreSchema
>;

export type UpdateStoreBody = z.infer<
  typeof updateStoreSchema
>;
