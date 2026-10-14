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
