import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";

export function createCategoryRouter(
  controller: CategoryController = new CategoryController(),
) {
  const router = Router();

  router.get("/", controller.getRootCategories.bind(controller));
  router.get("/slug/:slug", controller.getBySlug.bind(controller));
  router.get("/:id/children", controller.getChildren.bind(controller));
  router.get("/:id", controller.getById.bind(controller));

  router.post("/", controller.create.bind(controller));
  router.patch("/:id", controller.update.bind(controller));

  return router;
}
