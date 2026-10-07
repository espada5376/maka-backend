import express from "express";
import { describe, expect, it, vi } from "vitest";

import { createProductImageRouter } from "../../src/routes/product-image.routes.js";

describe("ProductImageRouter", () => {
  it("should define the reorder route", () => {
    const controller = {
      reorder: vi.fn(),
      create: vi.fn(),
    };

    const router = createProductImageRouter(controller as any);

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({
      path: "/:productId/images/order",
      methods: ["put"],
    });
  });

  it("should define the image upload route", () => {
    const controller = {
      reorder: vi.fn(),
      create: vi.fn(),
    };

    const router = createProductImageRouter(controller as any);

    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));

    expect(routes).toContainEqual({
      path: "/:productId/images",
      methods: ["post"],
    });
  });

  it("should receive a multipart image through the upload route", async () => {
    const controller = {
      reorder: vi.fn(),
      create: vi.fn((req, res) => {
        res.status(201).json({
          success: true,
          productId: req.params.productId,
          filename: req.file?.originalname,
          mimetype: req.file?.mimetype,
          size: req.file?.size,
          position: req.body.position,
        });
      }),
    };

    const app = express();

    app.use(
      "/api/v1/products",
      createProductImageRouter(controller as any),
    );

    const formData = new FormData();

    formData.append(
      "image",
      new Blob(["fake-image-content"], {
        type: "image/jpeg",
      }),
      "photo.jpg",
    );

    formData.append("position", "2");

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Could not determine server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/products/product-1/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toEqual({
        success: true,
        productId: "product-1",
        filename: "photo.jpg",
        mimetype: "image/jpeg",
        size: 18,
        position: "2",
      });

      expect(controller.create).toHaveBeenCalledOnce();
    } finally {
      server.close();
    }
  });
});
