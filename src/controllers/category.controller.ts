import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  CategoryIdParams,
  CategorySlugParams,
  CreateCategoryBody,
  UpdateCategoryBody,
} from "../common/http/validation/category.schemas.js";
import { CategoryService } from "../services/category.service.js";

export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  async getById(
    req: HttpRequest<CategoryIdParams>,
    res: Response,
  ): Promise<void> {
    const category = await this.categoryService.getById(
      req.params.id,
    );

    sendSuccess(res, 200, category);
  }

  async getBySlug(
    req: HttpRequest<CategorySlugParams>,
    res: Response,
  ): Promise<void> {
    const category = await this.categoryService.getBySlug(
      req.params.slug,
    );

    sendSuccess(res, 200, category);
  }

  async getChildren(
    req: HttpRequest<CategoryIdParams>,
    res: Response,
  ): Promise<void> {
    const categories = await this.categoryService.getChildren(
      req.params.id,
    );

    sendSuccess(res, 200, categories);
  }

  async getRootCategories(
    _req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const categories =
      await this.categoryService.getRootCategories();

    sendSuccess(res, 200, categories);
  }

  async create(
    req: HttpRequest<{}, CreateCategoryBody>,
    res: Response,
  ): Promise<void> {
    const category = await this.categoryService.create(
      req.body,
    );

    sendSuccess(res, 201, category);
  }

  async update(
    req: HttpRequest<CategoryIdParams, UpdateCategoryBody>,
    res: Response,
  ): Promise<void> {
    const category = await this.categoryService.update(
      req.params.id,
      req.body,
    );

    sendSuccess(res, 200, category);
  }
}
