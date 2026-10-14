import { z } from "zod";
export const productImageParamsSchema = z.object({
    productId: z.string().min(1),
});
export const reorderProductImagesSchema = z.object({
    imageIds: z.array(z.string().min(1)).min(1),
});
