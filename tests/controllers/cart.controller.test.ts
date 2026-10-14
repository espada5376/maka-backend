import { describe, expect, it, vi } from "vitest";
import type { Response } from "express";

import { CartController } from "../../src/controllers/cart.controller.js";

function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    session: { id: "session-1" },
    params: {},
    body: {},
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

describe("CartController", () => {
  describe("getCart", () => {
    it("returns the cart and 200", async () => {
      const cart = { id: "cart-1", items: [] };
      const cartService = {
        getCart: vi.fn().mockResolvedValue(cart),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await controller.getCart(createRequest(), res);

      expect(cartService.getCart).toHaveBeenCalledWith("session-1");
      expectSuccess(res, 200, cart);
    });

    it("propagates service errors", async () => {
      const error = new Error("Cart lookup failed");
      const cartService = {
        getCart: vi.fn().mockRejectedValue(error),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await expect(controller.getCart(createRequest(), res)).rejects.toBe(
        error,
      );

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("addItem", () => {
    it("adds an item and returns 201", async () => {
      const item = { id: "item-1", product_id: "product-1", quantity: 2 };
      const body = { product_id: "product-1", quantity: 2 };
      const cartService = {
        addItem: vi.fn().mockResolvedValue(item),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await controller.addItem(createRequest({ body }), res);

      expect(cartService.addItem).toHaveBeenCalledWith(
        "session-1",
        "product-1",
        2,
      );
      expectSuccess(res, 201, item);
    });

    it("propagates service errors", async () => {
      const error = new Error("Adding cart item failed");
      const cartService = {
        addItem: vi.fn().mockRejectedValue(error),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await expect(
        controller.addItem(
          createRequest({
            body: { product_id: "product-1", quantity: 2 },
          }),
          res,
        ),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("updateItemQuantity", () => {
    it("updates an item quantity and returns 200", async () => {
      const item = { id: "item-1", product_id: "product-1", quantity: 3 };
      const cartService = {
        updateItemQuantity: vi.fn().mockResolvedValue(item),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await controller.updateItemQuantity(
        createRequest({
          params: { itemId: "item-1" },
          body: { quantity: 3 },
        }),
        res,
      );

      expect(cartService.updateItemQuantity).toHaveBeenCalledWith(
        "session-1",
        "item-1",
        3,
      );
      expectSuccess(res, 200, item);
    });

    it("propagates service errors", async () => {
      const error = new Error("Cart item update failed");
      const cartService = {
        updateItemQuantity: vi.fn().mockRejectedValue(error),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await expect(
        controller.updateItemQuantity(
          createRequest({
            params: { itemId: "item-1" },
            body: { quantity: 3 },
          }),
          res,
        ),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("removes an item and returns 204", async () => {
      const cartService = {
        removeItem: vi.fn().mockResolvedValue(undefined),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await controller.removeItem(
        createRequest({ params: { itemId: "item-1" } }),
        res,
      );

      expect(cartService.removeItem).toHaveBeenCalledWith(
        "session-1",
        "item-1",
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalledOnce();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("propagates service errors", async () => {
      const error = new Error("Cart item removal failed");
      const cartService = {
        removeItem: vi.fn().mockRejectedValue(error),
      };
      const controller = new CartController(cartService as never);
      const res = createMockResponse();

      await expect(
        controller.removeItem(
          createRequest({ params: { itemId: "item-1" } }),
          res,
        ),
      ).rejects.toBe(error);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });
});
