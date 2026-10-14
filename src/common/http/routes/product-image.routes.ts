import { Router } from "express";

import { ProductImageController } from "../../../controllers/product-image.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import {
  validateBody,
  validateParams,
} from "../../http/validation/validate.js";
import {
  productImageParamsSchema,
  reorderProductImagesSchema,
} from "../../http/validation/product-image.schemas.js";
import { uploadImage } from "../../middlewares/upload-image.middleware.js";

export function createProductImageRouter(
  productImageController: ProductImageController,
) {
  const router = Router();

  router.post(
    "/:productId/images",
    validateParams(productImageParamsSchema),
    uploadImage.single("image"),
    asyncHandler(
      productImageController.create.bind(productImageController),
    ),
  );

  router.put(
    "/:productId/images/order",
    validateParams(productImageParamsSchema),
    validateBody(reorderProductImagesSchema),
    asyncHandler(
      productImageController.reorder.bind(productImageController),
    ),
  );

  return router;
}
