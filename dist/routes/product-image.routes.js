import { Router } from "express";
import { uploadImage } from "../common/middlewares/upload-image.middleware.js";
export function createProductImageRouter(productImageController) {
    const router = Router();
    router.post("/:productId/images", uploadImage.single("image"), productImageController.create.bind(productImageController));
    router.put("/:productId/images/order", productImageController.reorder.bind(productImageController));
    return router;
}
