import { z } from "zod";

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const updateUserSchema = z
  .object({
    name: z.string().max(100).nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export type UpdateUserBody = z.infer<typeof updateUserSchema>;
