import { Router } from "express";

import { validateBody, validateParams } from "../validation/validate.js";
import { asyncHandler } from "../async-handler.js";
import { UserController } from "../../../controllers/user.controller.js";
import {
  updateUserSchema,
  userIdParamsSchema,
} from "../validation/user.schemas.js";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";


export function createUserRouter(
  userController: UserController,
) {
  const router = Router();

  router.get(
  "/me",
  requireAuth,
  asyncHandler(userController.getMe.bind(userController)),
);

router.patch(
  "/me",
  requireAuth,
  validateBody(updateUserSchema),
  asyncHandler(userController.updateMe.bind(userController)),
);

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
