import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryController } from "../../src/controllers/category.controller.js";

describe("CategoryController", () => {
  const categoryService = {
    getById: vi.fn(),
    getBySlug: vi.fn(),
    getChildren: vi.fn(),
    getRootCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const controller = new CategoryController(categoryService as any);

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should return a category", async () => {
      const category = {
        id: "category-id",
        name: "Chaussures",
      };

      categoryService.getById.mockResolvedValue(category);

      const req = {
        params: {
          id: "category-id",
        },
      };

      await controller.getById(req as any, res as any, next);

      expect(categoryService.getById).toHaveBeenCalledWith("category-id");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: category,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.getById.mockRejectedValue(error);

      const req = {
        params: {
          id: "category-id",
        },
      };

      await expect(
  controller.getById(req as any, res as any),
).rejects.toBe(error);
    });
  });

  describe("getBySlug", () => {
    it("should return a category", async () => {
      const category = {
        id: "category-id",
        slug: "chaussures",
      };

      categoryService.getBySlug.mockResolvedValue(category);

      const req = {
        params: {
          slug: "chaussures",
        },
      };

      await controller.getBySlug(req as any, res as any, next);

      expect(categoryService.getBySlug).toHaveBeenCalledWith("chaussures");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: category,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.getBySlug.mockRejectedValue(error);

      const req = {
        params: {
          slug: "chaussures",
        },
      };

      await expect(
  controller.getBySlug(req as any, res as any),
).rejects.toBe(error);
    });
  });

  describe("getChildren", () => {
    it("should return child categories", async () => {
      const categories = [
        {
          id: "child-1",
          parent_id: "parent-id",
          name: "Baskets",
        },
      ];

      categoryService.getChildren.mockResolvedValue(categories);

      const req = {
        params: {
          id: "parent-id",
        },
      };

      await controller.getChildren(req as any, res as any, next);

      expect(categoryService.getChildren).toHaveBeenCalledWith("parent-id");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: categories,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.getChildren.mockRejectedValue(error);

      const req = {
        params: {
          id: "parent-id",
        },
      };

      await expect(
  controller.getChildren(req as any, res as any),
).rejects.toBe(error);
    });
  });

  describe("getRootCategories", () => {
    it("should return root categories", async () => {
      const categories = [
        {
          id: "category-1",
          parent_id: null,
          name: "Chaussures",
        },
      ];

      categoryService.getRootCategories.mockResolvedValue(categories);

      const req = {};

      await controller.getRootCategories(req as any, res as any, next);

      expect(categoryService.getRootCategories).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: categories,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.getRootCategories.mockRejectedValue(error);

      const req = {};

      await expect(
  controller.getRootCategories(req as any, res as any),
).rejects.toBe(error);
    });
  });

  describe("create", () => {
    it("should create a category", async () => {
      const data = {
        name: "Chaussures",
        slug: "chaussures",
      };

      const category = {
        id: "category-id",
        ...data,
        parent_id: null,
      };

      categoryService.create.mockResolvedValue(category);

      const req = {
        body: data,
      };

      await controller.create(req as any, res as any, next);

      expect(categoryService.create).toHaveBeenCalledWith(data);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: category,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.create.mockRejectedValue(error);

      const req = {
        body: {
          name: "Chaussures",
          slug: "chaussures",
        },
      };

      await expect(
  controller.create(req as any, res as any),
).rejects.toBe(error);
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      const data = {
        name: "Chaussures pour hommes",
      };

      const category = {
        id: "category-id",
        name: "Chaussures pour hommes",
        slug: "chaussures",
      };

      categoryService.update.mockResolvedValue(category);

      const req = {
        params: {
          id: "category-id",
        },
        body: data,
      };

      await controller.update(req as any, res as any, next);

      expect(categoryService.update).toHaveBeenCalledWith(
        "category-id",
        data,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: category,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Service error");

      categoryService.update.mockRejectedValue(error);

      const req = {
        params: {
          id: "category-id",
        },
        body: {
          name: "Chaussures pour hommes",
        },
      };

      await expect(
  controller.update(req as any, res as any),
).rejects.toBe(error);
    });
  });
});
