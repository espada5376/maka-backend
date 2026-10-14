import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { validateBody, validateParams, } from "../../http/validation/validate.js";
import { createProductSchema, productCategoryIdParamsSchema, productIdParamsSchema, productStoreIdParamsSchema, setProductAvailabilitySchema, updateProductSchema, } from "../../http/validation/product.schemas.js";
export function createProductRouter(productController) {
    const router = Router();
    router.post("/", validateBody(createProductSchema), asyncHandler(productController.create.bind(productController)));
    router.get("/store/:storeId/available", validateParams(productStoreIdParamsSchema), asyncHandler(productController.getAvailableByStore.bind(productController)));
    router.get("/store/:storeId", validateParams(productStoreIdParamsSchema), asyncHandler(productController.getByStore.bind(productController)));
    router.get("/category/:categoryId", validateParams(productCategoryIdParamsSchema), asyncHandler(productController.getByCategory.bind(productController)));
    router.get("/:id", validateParams(productIdParamsSchema), asyncHandler(productController.getById.bind(productController)));
    router.patch("/:id", validateParams(productIdParamsSchema), validateBody(updateProductSchema), asyncHandler(productController.update.bind(productController)));
    router.patch("/:id/availability", validateParams(productIdParamsSchema), validateBody(setProductAvailabilitySchema), asyncHandler(productController.setAvailability.bind(productController)));
    router.patch("/:id/archive", validateParams(productIdParamsSchema), asyncHandler(productController.archive.bind(productController)));
    router.patch("/:id/unarchive", validateParams(productIdParamsSchema), asyncHandler(productController.unarchive.bind(productController)));
    return router;
}
