import { z } from "zod";

export const createOrderSchema = z.object({
  buyerPhone: z.string().trim().min(1),
  deliveryCountry: z.string().trim().min(1),
  deliveryCity: z.string().trim().min(1),
  deliveryAddress: z.string().trim().min(1),
});

export const createDirectOrderSchema = createOrderSchema.extend({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

export const orderIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export const storeOrderParamsSchema = z.object({
  storeId: z.string().uuid(),
});

export const storeOrderDetailParamsSchema = z.object({
  storeId: z.string().uuid(),
  orderId: z.string().uuid(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "delivering",
    "delivered",
    "cancelled",
  ]),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
export type CreateDirectOrderBody = z.infer<typeof createDirectOrderSchema>;
export type OrderIdParams = z.infer<typeof orderIdParamsSchema>;
export type StoreOrderParams = z.infer<typeof storeOrderParamsSchema>;
export type StoreOrderDetailParams = z.infer<
  typeof storeOrderDetailParamsSchema
>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
