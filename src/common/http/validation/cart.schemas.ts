import { z } from "zod";

export const cartItemIdParamsSchema = z.object({
  itemId: z.string().min(1),
});

export const addCartItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const updateCartItemQuantitySchema = z.object({
  quantity: z.number().int().positive(),
});

export type CartItemIdParams = z.infer<typeof cartItemIdParamsSchema>;

export type AddCartItemBody = z.infer<typeof addCartItemSchema>;

export type UpdateCartItemQuantityBody = z.infer<
  typeof updateCartItemQuantitySchema
>;
