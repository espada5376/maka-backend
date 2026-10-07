import { Router } from "express";

import { uploadImage } from "../common/middlewares/upload-image.middleware.js";
import { ProductImageController } from "../controllers/product-image.controller.js";

export function createProductImageRouter(
  productImageController: ProductImageController,
) {
  const router = Router();

  router.post(
    "/:productId/images",
    uploadImage.single("image"),
    productImageController.create.bind(productImageController),
  );

  router.put(
    "/:productId/images/order",
    productImageController.reorder.bind(productImageController),
  );

  return router;
}
