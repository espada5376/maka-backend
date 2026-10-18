import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrderRouter } from "../../src/common/http/routes/order.routes.js";
import type { OrderController } from "../../src/controllers/order.controller.js";

describe("OrderRouter", () => {
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
    controller: Partial<OrderController> = {},
  ): Promise<number> {
    const completeController = {
      createFromCart: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
      createDirect: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
      getForCurrentBuyer: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
      getForCurrentBuyerById: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
      getForSeller: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
      updateStatusBySeller: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
      ...controller,
    };

    const app = express();
    app.use(express.json());
    app.use("/api/v1", createOrderRouter(
      completeController as OrderController,
    ));

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

  const validOrderBody = {
    buyerPhone: "+22890000000",
    deliveryCountry: "TG",
    deliveryCity: "Lomé",
    deliveryAddress: "Adresse de livraison",
  };

  const idempotencyHeaders = {
    "Content-Type": "application/json",
    "Idempotency-Key": "test-order-001",
  };

  it("routes POST /orders to createFromCart", async () => {
    const controller = {
      createFromCart: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/orders`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify(validOrderBody),
    });

    expect(response.status).toBe(201);
    expect(controller.createFromCart).toHaveBeenCalledOnce();
  });

  it("rejects cart order creation without an idempotency key", async () => {
    const controller = {
      createFromCart: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validOrderBody),
    });

    expect(response.status).toBe(400);
    expect(controller.createFromCart).not.toHaveBeenCalled();
  });

  it("rejects cart order creation with an invalid body", async () => {
    const controller = {
      createFromCart: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/orders`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify({
        ...validOrderBody,
        deliveryCity: "   ",
      }),
    });

    expect(response.status).toBe(400);
    expect(controller.createFromCart).not.toHaveBeenCalled();
  });

  it("routes POST /orders/direct to createDirect", async () => {
    const controller = {
      createDirect: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/orders/direct`,
      {
        method: "POST",
        headers: idempotencyHeaders,
        body: JSON.stringify({
          ...validOrderBody,
          productId: "product-1",
          quantity: 2,
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(controller.createDirect).toHaveBeenCalledOnce();
  });

  it("rejects direct order creation with a non-positive quantity", async () => {
    const controller = {
      createDirect: vi.fn((_req, res) =>
        res.status(201).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/orders/direct`,
      {
        method: "POST",
        headers: idempotencyHeaders,
        body: JSON.stringify({
          ...validOrderBody,
          productId: "product-1",
          quantity: 0,
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(controller.createDirect).not.toHaveBeenCalled();
  });

  it("routes GET /orders to getForCurrentBuyer", async () => {
    const controller = {
      getForCurrentBuyer: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/orders`);

    expect(response.status).toBe(200);
    expect(controller.getForCurrentBuyer).toHaveBeenCalledOnce();
  });

  it("routes GET /orders/:orderId to getForCurrentBuyerById", async () => {
    const controller = {
      getForCurrentBuyerById: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/orders/550e8400-e29b-41d4-a716-446655440000`,
    );

    expect(response.status).toBe(200);
    expect(controller.getForCurrentBuyerById).toHaveBeenCalledOnce();
  });

  it("routes GET /stores/:storeId/orders to getForSeller", async () => {
    const controller = {
      getForSeller: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/660e8400-e29b-41d4-a716-446655440000/orders`,
    );

    expect(response.status).toBe(200);
    expect(controller.getForSeller).toHaveBeenCalledOnce();
  });

  it("routes PATCH order status to updateStatusBySeller", async () => {
    const controller = {
      updateStatusBySeller: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/660e8400-e29b-41d4-a716-446655440000/orders/550e8400-e29b-41d4-a716-446655440000/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      },
    );

    expect(response.status).toBe(200);
    expect(controller.updateStatusBySeller).toHaveBeenCalledOnce();
  });

  it("rejects an unsupported order status", async () => {
    const controller = {
      updateStatusBySeller: vi.fn((_req, res) =>
        res.status(200).json({ success: true }),
      ),
    };
    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/660e8400-e29b-41d4-a716-446655440000/orders/550e8400-e29b-41d4-a716-446655440000/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shipped" }),
      },
    );

    expect(response.status).toBe(400);
    expect(controller.updateStatusBySeller).not.toHaveBeenCalled();
  });
});
