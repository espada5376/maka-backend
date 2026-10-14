import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import { ProductController } from "../../src/controllers/product.controller.js";
import type { Product } from "../../src/database/repositories/product.repository.js";

function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createProduct(): Product {
  return {
    id: "product-1",
    store_id: "store-1",
    category_id: "category-1",
    name: "Chaussures",
    description: "Chaussures de sport",
    price: "12000.00",
    availability: "available",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    session: { id: "session-1" },
    params: {},
    body: {},
    ...overrides,
  } as never;
}

function expectSuccess(
  res: Response,
  status: number,
  data: unknown,
) {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    data,
  });
}

describe("ProductController", () => {
  describe("create", () => {
    it("creates a product and returns 201", async () => {
      const product = createProduct();
      const productService = {
        create: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const body = {
        category_id: "category-1",
        name: "Chaussures",
        price: 12000,
      };
      const req = createRequest({ body });
      const res = createMockResponse();

      await controller.create(req, res);

      expect(productService.create).toHaveBeenCalledWith("session-1", body);
      expectSuccess(res, 201, product);
    });

    it("propagates service errors", async () => {
      const error = new Error("Product creation failed");
      const productService = {
        create: vi.fn().mockRejectedValue(error),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await expect(
        controller.create(createRequest(), res),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("returns the product and 200", async () => {
      const product = createProduct();
      const productService = {
        getById: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.getById(
        createRequest({ params: { id: "product-1" } }),
        res,
      );

      expect(productService.getById).toHaveBeenCalledWith("product-1");
      expectSuccess(res, 200, product);
    });

    it("propagates service errors", async () => {
      const error = new Error("Product lookup failed");
      const productService = {
        getById: vi.fn().mockRejectedValue(error),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await expect(
        controller.getById(
          createRequest({ params: { id: "product-1" } }),
          res,
        ),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getByStore", () => {
    it("returns the store products and forwards the session", async () => {
      const products = [createProduct()];
      const productService = {
        getByStore: vi.fn().mockResolvedValue(products),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.getByStore(
        createRequest({ params: { storeId: "store-1" } }),
        res,
      );

      expect(productService.getByStore).toHaveBeenCalledWith(
        "session-1",
        "store-1",
      );
      expectSuccess(res, 200, products);
    });
  });

  describe("getAvailableByStore", () => {
    it("returns the available store products", async () => {
      const products = [createProduct()];
      const productService = {
        getAvailableByStore: vi.fn().mockResolvedValue(products),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.getAvailableByStore(
        createRequest({ params: { storeId: "store-1" } }),
        res,
      );

      expect(productService.getAvailableByStore).toHaveBeenCalledWith("store-1");
      expectSuccess(res, 200, products);
    });
  });

  describe("getByCategory", () => {
    it("returns the category products", async () => {
      const products = [createProduct()];
      const productService = {
        getByCategory: vi.fn().mockResolvedValue(products),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.getByCategory(
        createRequest({ params: { categoryId: "category-1" } }),
        res,
      );

      expect(productService.getByCategory).toHaveBeenCalledWith("category-1");
      expectSuccess(res, 200, products);
    });
  });

  describe("update", () => {
    it("updates a product and forwards the session", async () => {
      const product = createProduct();
      const body = { name: "Nouvelles chaussures" };
      const productService = {
        update: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.update(
        createRequest({
          params: { id: "product-1" },
          body,
        }),
        res,
      );

      expect(productService.update).toHaveBeenCalledWith(
        "session-1",
        "product-1",
        body,
      );
      expectSuccess(res, 200, product);
    });
  });

  describe("setAvailability", () => {
    it("updates availability and forwards the session", async () => {
      const product = {
        ...createProduct(),
        availability: "unavailable" as const,
      };
      const productService = {
        setAvailability: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.setAvailability(
        createRequest({
          params: { id: "product-1" },
          body: { availability: "unavailable" },
        }),
        res,
      );

      expect(productService.setAvailability).toHaveBeenCalledWith(
        "session-1",
        "product-1",
        "unavailable",
      );
      expectSuccess(res, 200, product);
    });
  });

  describe("archive", () => {
    it("archives a product and forwards the session", async () => {
      const product = {
        ...createProduct(),
        status: "archived" as const,
      };
      const productService = {
        archive: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.archive(
        createRequest({ params: { id: "product-1" } }),
        res,
      );

      expect(productService.archive).toHaveBeenCalledWith(
        "session-1",
        "product-1",
      );
      expectSuccess(res, 200, product);
    });
  });

  describe("unarchive", () => {
    it("unarchives a product and forwards the session", async () => {
      const product = createProduct();
      const productService = {
        unarchive: vi.fn().mockResolvedValue(product),
      };
      const controller = new ProductController(productService as never);
      const res = createMockResponse();

      await controller.unarchive(
        createRequest({ params: { id: "product-1" } }),
        res,
      );

      expect(productService.unarchive).toHaveBeenCalledWith(
        "session-1",
        "product-1",
      );
      expectSuccess(res, 200, product);
    });
  });
});
