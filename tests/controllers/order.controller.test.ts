import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import { OrderController } from "../../src/controllers/order.controller.js";

function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    session: { id: "session-1" },
    params: {},
    body: {},
    get: vi.fn((header: string) =>
      header.toLowerCase() === "idempotency-key"
        ? "order-key-001"
        : undefined,
    ),
    ...overrides,
  } as never;
}

function expectSuccess(res: Response, status: number, data: unknown) {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    data,
  });
}

describe("OrderController", () => {
  const orderBody = {
    buyerPhone: "+22890000000",
    deliveryCountry: "TG",
    deliveryCity: "Lomé",
    deliveryAddress: "Adresse de livraison",
  };

  describe("createFromCart", () => {
    it("creates an order from the cart and returns 201", async () => {
      const order = { id: "order-1", items: [] };
      const orderService = {
        createFromCart: vi.fn().mockResolvedValue(order),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.createFromCart(
        createRequest({ body: orderBody }),
        res,
      );

      expect(orderService.createFromCart).toHaveBeenCalledWith(
        "session-1",
        {
          ...orderBody,
          idempotencyKey: "order-key-001",
        },
      );
      expectSuccess(res, 201, order);
    });

    it("propagates service errors", async () => {
      const error = new Error("Order creation failed");
      const orderService = {
        createFromCart: vi.fn().mockRejectedValue(error),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await expect(
        controller.createFromCart(
          createRequest({ body: orderBody }),
          res,
        ),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("createDirect", () => {
    it("creates a direct order and returns 201", async () => {
      const order = { id: "order-2", items: [] };
      const body = {
        ...orderBody,
        productId: "product-1",
        quantity: 2,
      };
      const orderService = {
        createDirect: vi.fn().mockResolvedValue(order),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.createDirect(createRequest({ body }), res);

      expect(orderService.createDirect).toHaveBeenCalledWith(
        "session-1",
        {
          ...body,
          idempotencyKey: "order-key-001",
        },
      );
      expectSuccess(res, 201, order);
    });
  });

  describe("getForCurrentBuyer", () => {
    it("returns the current buyer's orders and 200", async () => {
      const orders = [{ id: "order-1" }, { id: "order-2" }];
      const orderService = {
        getForCurrentBuyer: vi.fn().mockResolvedValue(orders),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.getForCurrentBuyer(createRequest(), res);

      expect(orderService.getForCurrentBuyer).toHaveBeenCalledWith(
        "session-1",
      );
      expectSuccess(res, 200, orders);
    });
  });

  describe("getForCurrentBuyerById", () => {
    it("returns an order by ID and 200", async () => {
      const order = { id: "order-1", items: [] };
      const orderService = {
        getForCurrentBuyerById: vi.fn().mockResolvedValue(order),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.getForCurrentBuyerById(
        createRequest({ params: { orderId: "order-1" } }),
        res,
      );

      expect(orderService.getForCurrentBuyerById).toHaveBeenCalledWith(
        "session-1",
        "order-1",
      );
      expectSuccess(res, 200, order);
    });
  });

  describe("getForSeller", () => {
    it("returns the store's orders and 200", async () => {
      const orders = [{ id: "order-1" }];
      const orderService = {
        getForSeller: vi.fn().mockResolvedValue(orders),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.getForSeller(
        createRequest({ params: { storeId: "store-1" } }),
        res,
      );

      expect(orderService.getForSeller).toHaveBeenCalledWith(
        "session-1",
        "store-1",
      );
      expectSuccess(res, 200, orders);
    });
  });

  describe("updateStatusBySeller", () => {
    it("updates the order status and returns 200", async () => {
      const order = { id: "order-1", status: "confirmed" };
      const orderService = {
        updateStatusBySeller: vi.fn().mockResolvedValue(order),
      };
      const controller = new OrderController(orderService as never);
      const res = createMockResponse();

      await controller.updateStatusBySeller(
        createRequest({
          params: { storeId: "store-1", orderId: "order-1" },
          body: { status: "confirmed" },
        }),
        res,
      );

      expect(orderService.updateStatusBySeller).toHaveBeenCalledWith(
        "session-1",
        "store-1",
        "order-1",
        "confirmed",
      );
      expectSuccess(res, 200, order);
    });
  });
});
