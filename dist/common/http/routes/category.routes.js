import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { validateBody, validateParams, } from "../../http/validation/validate.js";
import { categoryIdParamsSchema, categorySlugParamsSchema, createCategorySchema, updateCategorySchema, } from "../../http/validation/category.schemas.js";
export function createCategoryRouter(controller) {
    const router = Router();
    router.get("/", asyncHandler(controller.getRootCategories.bind(controller)));
    router.get("/slug/:slug", validateParams(categorySlugParamsSchema), asyncHandler(controller.getBySlug.bind(controller)));
    router.get("/:id/children", validateParams(categoryIdParamsSchema), asyncHandler(controller.getChildren.bind(controller)));
    router.get("/:id", validateParams(categoryIdParamsSchema), asyncHandler(controller.getById.bind(controller)));
    router.post("/", validateBody(createCategorySchema), asyncHandler(controller.create.bind(controller)));
    router.patch("/:id", validateParams(categoryIdParamsSchema), validateBody(updateCategorySchema), asyncHandler(controller.update.bind(controller)));
    return router;
}
