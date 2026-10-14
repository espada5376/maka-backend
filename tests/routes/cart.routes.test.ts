import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createCartRouter } from "../../src/common/http/routes/cart.routes.js";
import type { CartController } from "../../src/controllers/cart.controller.js";

describe("CartRouter", () => {
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
    controller: Partial<CartController> = {},
  ): Promise<number> {
    const completeController = {
      getCart: vi.fn((_req, res) => res.status(200).json({ success: true })),
      addItem: vi.fn((_req, res) => res.status(201).json({ success: true })),
      updateItemQuantity: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
      removeItem: vi.fn((_req, res) => res.status(204).end()),
      ...controller,
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api/v1/cart",
      createCartRouter(completeController as CartController),
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

  it("routes GET / to getCart", async () => {
    const controller = {
      getCart: vi.fn((_req, res) => res.status(200).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/cart`);

    expect(response.status).toBe(200);
    expect(controller.getCart).toHaveBeenCalledOnce();
  });

  it("routes POST /items to addItem", async () => {
    const controller = {
      addItem: vi.fn((_req, res) => res.status(201).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: "product-1", quantity: 2 }),
    });

    expect(response.status).toBe(201);
    expect(controller.addItem).toHaveBeenCalledOnce();
  });

  it("rejects an invalid quantity when adding an item", async () => {
    const controller = {
      addItem: vi.fn((_req, res) => res.status(201).json({ success: true })),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: "product-1", quantity: 0 }),
    });

    expect(response.status).toBe(400);
    expect(controller.addItem).not.toHaveBeenCalled();
  });

  it("routes PATCH /items/:itemId to updateItemQuantity", async () => {
    const controller = {
      updateItemQuantity: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/cart/items/item-1`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3 }),
      },
    );

    expect(response.status).toBe(200);
    expect(controller.updateItemQuantity).toHaveBeenCalledOnce();
  });

  it("rejects an invalid item id when updating quantity", async () => {
    const controller = {
      updateItemQuantity: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/cart/items/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: 3 }),
      },
    );

    expect(response.status).toBe(404);
    expect(controller.updateItemQuantity).not.toHaveBeenCalled();
  });

  it("rejects an invalid quantity when updating an item", async () => {
    const controller = {
      updateItemQuantity: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/cart/items/item-1`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: -2 }),
      },
    );

    expect(response.status).toBe(400);
    expect(controller.updateItemQuantity).not.toHaveBeenCalled();
  });

  it("routes DELETE /items/:itemId to removeItem", async () => {
    const controller = {
      removeItem: vi.fn((_req, res) => res.status(204).end()),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/cart/items/item-1`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(204);
    expect(controller.removeItem).toHaveBeenCalledOnce();
  });
});
