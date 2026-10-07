import {
  CategoryRepository,
  CategoryStatus,
  CreateCategoryData,
  UpdateCategoryData,
} from "../database/repositories/category.repository.js";

import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";

export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async getById(id: string) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw createAppError(Errors.CATEGORY_NOT_FOUND);
    }

    return category;
  }

  async getBySlug(slug: string) {
    const category =
      await this.categoryRepository.findBySlug(slug);

    if (!category) {
      throw createAppError(Errors.CATEGORY_NOT_FOUND);
    }

    return category;
  }

  async getChildren(parentId: string) {
    const parent =
      await this.categoryRepository.findById(parentId);

    if (!parent) {
      throw createAppError(Errors.CATEGORY_NOT_FOUND);
    }

    return this.categoryRepository.findChildren(parentId);
  }

  async getRootCategories() {
    return this.categoryRepository.findRootCategories();
  }

  async create(data: CreateCategoryData) {
    this.validateName(data.name);
    this.validateSlug(data.slug);

    const existingCategory =
      await this.categoryRepository.findBySlug(data.slug);

    if (existingCategory) {
      throw createAppError(Errors.CATEGORY_SLUG_ALREADY_EXISTS);
    }

    let parentId: string | null = null;

    if (data.parent_id) {
      const parent =
        await this.categoryRepository.findById(data.parent_id);

      if (!parent) {
        throw createAppError(Errors.CATEGORY_PARENT_NOT_FOUND);
      }

      if (parent.status !== "active") {
        throw createAppError(Errors.CATEGORY_PARENT_INACTIVE);
      }

      if (parent.parent_id !== null) {
        throw createAppError(Errors.CATEGORY_MAX_DEPTH_REACHED);
      }

      parentId = parent.id;
    }

    return this.categoryRepository.create({
      name: data.name,
      slug: data.slug,
      parent_id: parentId,
    });
  }

  async update(
    id: string,
    data: UpdateCategoryData,
  ) {
    const category =
      await this.categoryRepository.findById(id);

    if (!category) {
      throw createAppError(Errors.CATEGORY_NOT_FOUND);
    }

    if (data.name !== undefined) {
      this.validateName(data.name);
    }

    if (data.slug !== undefined) {
      this.validateSlug(data.slug);

      const existingCategory =
        await this.categoryRepository.findBySlug(data.slug);

      if (
        existingCategory &&
        existingCategory.id !== category.id
      ) {
        throw createAppError(Errors.CATEGORY_SLUG_ALREADY_EXISTS);
      }
    }

    if (data.status !== undefined) {
      this.validateStatus(data.status);
    }

    if (data.parent_id !== undefined) {
      if (data.parent_id === id) {
        throw createAppError(Errors.CATEGORY_INVALID_PARENT);
      }

      if (data.parent_id !== null) {
        const parent =
          await this.categoryRepository.findById(
            data.parent_id,
          );

        if (!parent) {
          throw createAppError(Errors.CATEGORY_PARENT_NOT_FOUND);
        }

        if (parent.status !== "active") {
          throw createAppError(Errors.CATEGORY_PARENT_INACTIVE);
        }

        if (parent.parent_id !== null) {
          throw createAppError(Errors.CATEGORY_MAX_DEPTH_REACHED);
        }
      }
    }

    return this.categoryRepository.update(id, data);
  }

  private validateName(name: string): void {
    if (
      typeof name !== "string" ||
      name.trim().length === 0
    ) {
      throw createAppError(Errors.CATEGORY_INVALID_NAME);
    }
  }

  private validateSlug(slug: string): void {
    if (
      typeof slug !== "string" ||
      slug.trim().length === 0
    ) {
      throw createAppError(Errors.CATEGORY_INVALID_SLUG);
    }
  }

  private validateStatus(status: CategoryStatus): void {
    if (
      status !== "active" &&
      status !== "inactive"
    ) {
      throw createAppError(Errors.CATEGORY_INVALID_STATUS);
    }
  }
}
