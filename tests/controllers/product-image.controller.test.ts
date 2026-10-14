import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

import { ProductImageController } from "../../src/controllers/product-image.controller.js";

describe("ProductImageController", () => {
  const productImageService = {
    create: vi.fn(),
    reorder: vi.fn(),
  };

  const productImageController =
    new ProductImageController(
      productImageService as any,
    );

  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };

  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
  });

  describe("create", () => {
    it("should create a product image", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://images.maka.tg/products/product-1/image-1.webp",
        position: 0,
        created_at: new Date(),
      };

      productImageService.create.mockResolvedValue(
        image,
      );

      const req = {
        session: {
          id: "session-1",
          user_id: "user-1",
        },
        params: {
          productId: "product-1",
        },
        file: {
          buffer: Buffer.from("fake-image"),
          mimetype: "image/jpeg",
        },
      } as unknown as Request;

      await productImageController.create(
        req,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      expect(
        productImageService.create,
      ).toHaveBeenCalledWith({
        sessionId: "session-1",
        product_id: "product-1",
        data: req.file!.buffer,
        contentType: "image/jpeg",
      });

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: image,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should return 400 when no image file is provided", async () => {
      const req = {
        session: {
          id: "session-1",
          user_id: "user-1",
        },
        params: {
          productId: "product-1",
        },
        file: undefined,
      } as unknown as Request;

      await productImageController.create(
        req,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
  success: false,
  error: {
    code: "IMAGE_REQUIRED",
    message: "Image file is required",
  },
});

      expect(
        productImageService.create,
      ).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it("should pass service errors", async () => {
      const error = new Error("Upload failed");

      productImageService.create.mockRejectedValue(
        error,
      );

      const req = {
        session: {
          id: "session-1",
          user_id: "user-1",
        },
        params: {
          productId: "product-1",
        },
        file: {
          buffer: Buffer.from("fake-image"),
          mimetype: "image/jpeg",
        },
      } as unknown as Request;

      await expect(
  productImageController.create(
    req,
    res as unknown as Response,
  ),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("should reorder product images and return the images", async () => {
      const images = [
        {
          id: "image-3",
          product_id: "product-1",
          url: "https://images.maka.tg/products/product-1/image-3.webp",
          position: 0,
          created_at: new Date(),
        },
        {
          id: "image-1",
          product_id: "product-1",
          url: "https://images.maka.tg/products/product-1/image-1.webp",
          position: 1,
          created_at: new Date(),
        },
      ];

      productImageService.reorder.mockResolvedValue(
        images,
      );

      const req = {
        session: {
          id: "session-1",
          user_id: "user-1",
        },
        params: {
          productId: "product-1",
        },
        body: {
          imageIds: ["image-3", "image-1"],
        },
      } as unknown as Request;

      await productImageController.reorder(
        req,
        res as unknown as Response,
        next as unknown as NextFunction,
      );

      expect(
        productImageService.reorder,
      ).toHaveBeenCalledWith(
        "product-1",
        "session-1",
        ["image-3", "image-1"],
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: images,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should pass service errors", async () => {
      const error = new Error("Reorder failed");

      productImageService.reorder.mockRejectedValue(
        error,
      );

      const req = {
        session: {
          id: "session-1",
          user_id: "user-1",
        },
        params: {
          productId: "product-1",
        },
        body: {
          imageIds: ["image-3", "image-1"],
        },
      } as unknown as Request;

      await expect(
  productImageController.reorder(
    req,
    res as unknown as Response,
  ),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });
});

