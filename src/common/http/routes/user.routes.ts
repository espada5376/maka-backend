import { Router } from "express";

import { validateBody, validateParams } from "../validation/validate.js";
import { asyncHandler } from "../async-handler.js";
import { UserController } from "../../../controllers/user.controller.js";
import {
  updateUserSchema,
  userIdParamsSchema,
} from "../validation/user.schemas.js";

export function createUserRouter(
  userController: UserController = new UserController(),
) {
  const router = Router();

  router.get(
    "/:id",
    validateParams(userIdParamsSchema),
    asyncHandler(userController.getById.bind(userController)),
  );

  router.patch(
    "/:id",
    validateParams(userIdParamsSchema),
    validateBody(updateUserSchema),
    asyncHandler(userController.update.bind(userController)),
  );

  return router;
}
