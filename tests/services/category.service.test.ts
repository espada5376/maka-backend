import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CategoryService,
  CategoryServiceError,
  CategoryErrorCode,
} from "../../src/services/category.service.js";

describe("CategoryService", () => {
  const mocks = {
    categoryRepository: {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findChildren: vi.fn(),
      findRootCategories: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const category = {
    id: "category-1",
    parent_id: null,
    name: "Beauté",
    slug: "beaute",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const childCategory = {
    id: "category-2",
    parent_id: "category-1",
    name: "Cheveux",
    slug: "cheveux",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  let categoryService: CategoryService;

  beforeEach(() => {
    vi.clearAllMocks();

    categoryService = new CategoryService(mocks.categoryRepository as any);
  });

  describe("getById", () => {
    it("should return a category", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      const result = await categoryService.getById("category-1");

      expect(result).toEqual(category);
      expect(mocks.categoryRepository.findById).toHaveBeenCalledWith(
        "category-1",
      );
    });

    it("should reject when the category does not exist", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(categoryService.getById("unknown")).rejects.toMatchObject({
        code: CategoryErrorCode.CATEGORY_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");

      mocks.categoryRepository.findById.mockRejectedValue(error);

      await expect(categoryService.getById("category-1")).rejects.toBe(error);
    });
  });

  describe("getBySlug", () => {
    it("should return a category by slug", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(category);

      const result = await categoryService.getBySlug("beaute");

      expect(result).toEqual(category);
      expect(mocks.categoryRepository.findBySlug).toHaveBeenCalledWith(
        "beaute",
      );
    });

    it("should reject when the slug does not exist", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      await expect(categoryService.getBySlug("unknown")).rejects.toMatchObject({
        code: CategoryErrorCode.CATEGORY_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("Database error");

      mocks.categoryRepository.findBySlug.mockRejectedValue(error);

      await expect(categoryService.getBySlug("beaute")).rejects.toBe(error);
    });
  });

  describe("getChildren", () => {
    it("should return child categories", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.findChildren.mockResolvedValue([childCategory]);

      const result = await categoryService.getChildren("category-1");

      expect(result).toEqual([childCategory]);

      expect(mocks.categoryRepository.findChildren).toHaveBeenCalledWith(
        "category-1",
      );
    });

    it("should reject when the parent category does not exist", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(
        categoryService.getChildren("unknown"),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.CATEGORY_NOT_FOUND,
      });

      expect(mocks.categoryRepository.findChildren).not.toHaveBeenCalled();
    });
  });

  describe("getRootCategories", () => {
    it("should return root categories", async () => {
      mocks.categoryRepository.findRootCategories.mockResolvedValue([category]);

      const result = await categoryService.getRootCategories();

      expect(result).toEqual([category]);

      expect(
        mocks.categoryRepository.findRootCategories,
      ).toHaveBeenCalledOnce();
    });

    it("should return an empty array when there are no root categories", async () => {
      mocks.categoryRepository.findRootCategories.mockResolvedValue([]);

      const result = await categoryService.getRootCategories();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a root category", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.create.mockResolvedValue(category);

      const result = await categoryService.create({
        name: "Beauté",
        slug: "beaute",
      });

      expect(result).toEqual(category);

      expect(mocks.categoryRepository.create).toHaveBeenCalledWith({
        name: "Beauté",
        slug: "beaute",
        parent_id: null,
      });
    });

    it("should create a child category", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.create.mockResolvedValue(childCategory);

      const result = await categoryService.create({
        name: "Cheveux",
        slug: "cheveux",
        parent_id: "category-1",
      });

      expect(result).toEqual(childCategory);

      expect(mocks.categoryRepository.create).toHaveBeenCalledWith({
        name: "Cheveux",
        slug: "cheveux",
        parent_id: "category-1",
      });
    });

    it("should reject an empty name", async () => {
      await expect(
        categoryService.create({
          name: "",
          slug: "beaute",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_NAME,
      });

      expect(mocks.categoryRepository.create).not.toHaveBeenCalled();
    });

    it("should reject an empty slug", async () => {
      await expect(
        categoryService.create({
          name: "Beauté",
          slug: "",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_SLUG,
      });

      expect(mocks.categoryRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a duplicate slug", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(category);

      await expect(
        categoryService.create({
          name: "Beauté",
          slug: "beaute",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.SLUG_ALREADY_EXISTS,
      });

      expect(mocks.categoryRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the parent category does not exist", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(
        categoryService.create({
          name: "Cheveux",
          slug: "cheveux",
          parent_id: "unknown",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.PARENT_CATEGORY_NOT_FOUND,
      });
    });

    it("should reject an inactive parent category", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.findById.mockResolvedValue({
        ...category,
        status: "inactive",
      });

      await expect(
        categoryService.create({
          name: "Cheveux",
          slug: "cheveux",
          parent_id: "category-1",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.PARENT_CATEGORY_INACTIVE,
      });
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      const updatedCategory = {
        ...category,
        name: "Beauté & Soins",
        slug: "beaute-soins",
      };

      mocks.categoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await categoryService.update("category-1", {
        name: "Beauté & Soins",
        slug: "beaute-soins",
      });

      expect(result).toEqual(updatedCategory);

      expect(mocks.categoryRepository.update).toHaveBeenCalledWith(
        "category-1",
        {
          name: "Beauté & Soins",
          slug: "beaute-soins",
        },
      );
    });

    it("should reject when the category does not exist", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(
        categoryService.update("unknown", {
          name: "Beauté",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.CATEGORY_NOT_FOUND,
      });

      expect(mocks.categoryRepository.update).not.toHaveBeenCalled();
    });

    it("should reject an empty name", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      await expect(
        categoryService.update("category-1", {
          name: "",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_NAME,
      });

      expect(mocks.categoryRepository.update).not.toHaveBeenCalled();
    });

    it("should reject an empty slug", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      await expect(
        categoryService.update("category-1", {
          slug: "",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_SLUG,
      });

      expect(mocks.categoryRepository.update).not.toHaveBeenCalled();
    });

    it("should reject a duplicate slug", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.findBySlug.mockResolvedValue({
        ...childCategory,
        slug: "nouveau-slug",
      });

      await expect(
        categoryService.update("category-1", {
          slug: "nouveau-slug",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.SLUG_ALREADY_EXISTS,
      });
    });

    it("should allow keeping the same slug", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.findBySlug.mockResolvedValue(category);

      mocks.categoryRepository.update.mockResolvedValue(category);

      const result = await categoryService.update("category-1", {
        slug: "beaute",
      });

      expect(result).toEqual(category);
    });

    it("should reject when the new parent does not exist", async () => {
      mocks.categoryRepository.findById
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(undefined);

      await expect(
        categoryService.update("category-1", {
          parent_id: "unknown",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.PARENT_CATEGORY_NOT_FOUND,
      });
    });

    it("should reject an inactive parent", async () => {
      mocks.categoryRepository.findById
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce({
          ...category,
          id: "category-3",
          status: "inactive",
        });

      await expect(
        categoryService.update("category-1", {
          parent_id: "category-3",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.PARENT_CATEGORY_INACTIVE,
      });
    });

    it("should reject a category as its own parent", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      await expect(
        categoryService.update("category-1", {
          parent_id: "category-1",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_PARENT,
      });
    });
  });

  describe("status", () => {
    it("should deactivate a category", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.update.mockResolvedValue({
        ...category,
        status: "inactive",
      });

      const result = await categoryService.update("category-1", {
        status: "inactive",
      });

      expect(result.status).toBe("inactive");
    });

    it("should reactivate a category", async () => {
      const inactiveCategory = {
        ...category,
        status: "inactive" as const,
      };

      mocks.categoryRepository.findById.mockResolvedValue(inactiveCategory);

      mocks.categoryRepository.update.mockResolvedValue(category);

      const result = await categoryService.update("category-1", {
        status: "active",
      });

      expect(result.status).toBe("active");
    });

    it("should reject an invalid status", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(category);

      await expect(
        categoryService.update("category-1", {
          status: "invalid" as any,
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.INVALID_STATUS,
      });
    });
  });

  describe("hierarchy", () => {
    it("should allow a root category to receive a child", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.create.mockResolvedValue(childCategory);

      const result = await categoryService.create({
        name: "Cheveux",
        slug: "cheveux",
        parent_id: "category-1",
      });

      expect(result.parent_id).toBe("category-1");
    });

    it("should reject creating a child under a child category", async () => {
      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.findById.mockResolvedValue(childCategory);

      await expect(
        categoryService.create({
          name: "Perruques",
          slug: "perruques",
          parent_id: "category-2",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.MAX_DEPTH_REACHED,
      });

      expect(mocks.categoryRepository.create).not.toHaveBeenCalled();
    });

    it("should reject moving a root category under a child category", async () => {
      mocks.categoryRepository.findById
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(childCategory);

      await expect(
        categoryService.update("category-1", {
          parent_id: "category-2",
        }),
      ).rejects.toMatchObject({
        code: CategoryErrorCode.MAX_DEPTH_REACHED,
      });

      expect(mocks.categoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("repository error propagation", () => {
    it("should propagate create errors", async () => {
      const error = new Error("Database error");

      mocks.categoryRepository.findBySlug.mockResolvedValue(undefined);

      mocks.categoryRepository.create.mockRejectedValue(error);

      await expect(
        categoryService.create({
          name: "Beauté",
          slug: "beaute",
        }),
      ).rejects.toBe(error);
    });

    it("should propagate update errors", async () => {
      const error = new Error("Database error");

      mocks.categoryRepository.findById.mockResolvedValue(category);

      mocks.categoryRepository.update.mockRejectedValue(error);

      await expect(
        categoryService.update("category-1", {
          name: "Beauté",
        }),
      ).rejects.toBe(error);
    });
  });
});
