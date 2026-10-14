import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createProductRouter } from "../../src/common/http/routes/product.routes.js";
import type { ProductController } from "../../src/controllers/product.controller.js";

describe("ProductRouter", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      server = undefined;
    }
  });

  async function startServer(
    controller: Partial<ProductController> = {},
  ): Promise<number> {
    const completeController = {
      create: vi.fn((_req, res) => res.status(201).json({ success: true })),
      getById: vi.fn((_req, res) => res.status(200).json({ success: true })),
      getByStore: vi.fn((_req, res) => res.status(200).json({ success: true })),
      getAvailableByStore: vi.fn((_req, res) => res.status(200).json({ success: true })),
      getByCategory: vi.fn((_req, res) => res.status(200).json({ success: true })),
      update: vi.fn((_req, res) => res.status(200).json({ success: true })),
      setAvailability: vi.fn((_req, res) => res.status(200).json({ success: true })),
      archive: vi.fn((_req, res) => res.status(200).json({ success: true })),
      unarchive: vi.fn((_req, res) => res.status(200).json({ success: true })),
      ...controller,
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api/v1/products",
      createProductRouter(completeController as ProductController),
    );

    return new Promise((resolve, reject) => {
      server = app.listen(0, () => {
        const address = server?.address();

        if (!address || typeof address === "string") {
          reject(new Error("Unable to determine server port"));
          return;
        }

        resolve(address.port);
      });
    });
  }

  it("routes POST / to create", async () => {
    const controller = { create: vi.fn((_req, res) => res.status(201).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: "category-1",
        name: "Chaussures",
        price: 12000,
      }),
    });

    expect(response.status).toBe(201);
    expect(controller.create).toHaveBeenCalledOnce();
  });

  it("rejects product creation with an invalid price", async () => {
    const controller = { create: vi.fn((_req, res) => res.status(201).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category_id: "category-1",
        name: "Chaussures",
        price: -1,
      }),
    });

    expect(response.status).toBe(400);
    expect(controller.create).not.toHaveBeenCalled();
  });

  it("routes GET /:id to getById", async () => {
    const controller = { getById: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/product-1`);

    expect(response.status).toBe(200);
    expect(controller.getById).toHaveBeenCalledOnce();
  });

  it("routes GET /store/:storeId to getByStore", async () => {
    const controller = { getByStore: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/store/store-1`);

    expect(response.status).toBe(200);
    expect(controller.getByStore).toHaveBeenCalledOnce();
  });

  it("routes GET /store/:storeId/available to getAvailableByStore", async () => {
    const controller = {
      getAvailableByStore: vi.fn((_req, res) => res.status(200).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/products/store/store-1/available`,
    );

    expect(response.status).toBe(200);
    expect(controller.getAvailableByStore).toHaveBeenCalledOnce();
  });

  it("routes GET /category/:categoryId to getByCategory", async () => {
    const controller = { getByCategory: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/category/category-1`);

    expect(response.status).toBe(200);
    expect(controller.getByCategory).toHaveBeenCalledOnce();
  });

  it("routes PATCH /:id to update", async () => {
    const controller = { update: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/product-1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nouveau nom" }),
    });

    expect(response.status).toBe(200);
    expect(controller.update).toHaveBeenCalledOnce();
  });

  it("rejects an empty product update", async () => {
    const controller = { update: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/product-1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect(controller.update).not.toHaveBeenCalled();
  });

  it("routes PATCH /:id/availability to setAvailability", async () => {
    const controller = {
      setAvailability: vi.fn((_req, res) => res.status(200).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/products/product-1/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: "unavailable" }),
      },
    );

    expect(response.status).toBe(200);
    expect(controller.setAvailability).toHaveBeenCalledOnce();
  });

  it("rejects an invalid availability value", async () => {
    const controller = {
      setAvailability: vi.fn((_req, res) => res.status(200).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/products/product-1/availability`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: "out_of_stock" }),
      },
    );

    expect(response.status).toBe(400);
    expect(controller.setAvailability).not.toHaveBeenCalled();
  });

  it("routes PATCH /:id/archive to archive", async () => {
    const controller = { archive: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/product-1/archive`, {
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(controller.archive).toHaveBeenCalledOnce();
  });

  it("routes PATCH /:id/unarchive to unarchive", async () => {
    const controller = { unarchive: vi.fn((_req, res) => res.status(200).json({ success: true })) };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/products/product-1/unarchive`, {
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    expect(controller.unarchive).toHaveBeenCalledOnce();
  });
});
