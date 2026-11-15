import { Router } from "express";

import { requireAuth } from "../../middlewares/require-auth.middleware.js";
import { StoreController } from "../../../controllers/store.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
  validateBody,
  validateParams,
} from "../../http/validation/validate.js";
import {
  createStoreSchema,
  storeIdParamsSchema,
  storeOwnerIdParamsSchema,
  updateStoreSchema,
} from "../../http/validation/store.schemas.js";

export function createStoreRouter(
  storeController: StoreController,
) {
  const router = Router();

  router.post(
    "/",
    validateBody(createStoreSchema),
    asyncHandler(
      storeController.create.bind(storeController),
    ),
  );

  router.get(
    "/owner/:ownerId",
    validateParams(storeOwnerIdParamsSchema),
    asyncHandler(
      storeController.getByOwnerId.bind(storeController),
    ),
  );

    router.get(
    "/me",
    requireAuth,
    asyncHandler(storeController.getMe.bind(storeController)),
  );

  router.get(
    "/:id",
    validateParams(storeIdParamsSchema),
    asyncHandler(
      storeController.getById.bind(storeController),
    ),
  );

  router.patch(
    "/:id",
    validateParams(storeIdParamsSchema),
    validateBody(updateStoreSchema),
    asyncHandler(
      storeController.update.bind(storeController),
    ),
  );

  router.patch(
    "/:id/activate",
    validateParams(storeIdParamsSchema),
    asyncHandler(
      storeController.activate.bind(storeController),
    ),
  );

  router.patch(
    "/:id/deactivate",
    validateParams(storeIdParamsSchema),
    asyncHandler(
      storeController.deactivate.bind(storeController),
    ),
  );

  return router;
}
