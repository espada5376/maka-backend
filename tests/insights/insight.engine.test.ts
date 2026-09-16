import { describe, expect, it, vi } from "vitest";

import {
  Event,
  EventRepository,
} from "../../src/database/repositories/event.repository.js";

import {
  OrderItem,
  OrderRepository,
} from "../../src/database/repositories/order.repository.js";

import {
  InsightEngineImpl,
} from "../../src/insights/insight.engine.js";

function createEvent(
  overrides: Partial<Event> = {},
): Event {
  return {
    id: crypto.randomUUID(),
    event_name: "product.viewed",
    event_key: null,
    session_id: crypto.randomUUID(),
    user_id: null,
    store_id: crypto.randomUUID(),
    product_id: crypto.randomUUID(),
    order_id: null,
    metadata: {},
    occurred_at: new Date("2026-09-01T10:00:00.000Z"),
    ...overrides,
  };
}

function createOrderItem(
  overrides: Partial<OrderItem> = {},
): OrderItem {
  return {
    id: crypto.randomUUID(),
    order_id: crypto.randomUUID(),
    product_id: crypto.randomUUID(),
    product_name: "Produit test",
    unit_price: "1000.00",
    quantity: 1,
    subtotal: "1000.00",
    created_at: new Date("2026-09-01T10:00:00.000Z"),
    ...overrides,
  };
}

function createRepositories() {
  const eventRepository = {
    findByProductId: vi.fn(),
  } as unknown as EventRepository;

  const orderRepository = {
    findItemsByProductId: vi.fn(),
  } as unknown as OrderRepository;

  return {
    eventRepository,
    orderRepository,
  };
}

describe("InsightEngine", () => {
  describe("getProductMetrics", () => {
    it("returns zero metrics when the product has no activity", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);
      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const productId = crypto.randomUUID();

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result).toEqual({
        productId,
        metrics: {
          views: 0,
          shares: 0,
          cartAdds: 0,
          ordersContainingProduct: 0,
          unitsSold: 0,
          revenue: 0,
          conversionRate: 0,
          shareRate: 0,
          cartAddRate: 0,
        },
      });
    });

    it("counts product views", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.views).toBe(3);
    });

    it("counts product shares", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.shared",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.shared",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.shares).toBe(2);
    });

    it("counts cart additions", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "cart.item_added",
          product_id: productId,
        }),
        createEvent({
          event_name: "cart.item_added",
          product_id: productId,
        }),
        createEvent({
          event_name: "cart.item_added",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.cartAdds).toBe(3);
    });

    it("counts distinct orders containing the product", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      const orderA = crypto.randomUUID();
      const orderB = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
          order_id: orderA,
        }),
        createOrderItem({
          product_id: productId,
          order_id: orderA,
        }),
        createOrderItem({
          product_id: productId,
          order_id: orderB,
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.ordersContainingProduct).toBe(2);
    });

    it("sums the quantity sold", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
          quantity: 2,
        }),
        createOrderItem({
          product_id: productId,
          quantity: 3,
        }),
        createOrderItem({
          product_id: productId,
          quantity: 5,
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.unitsSold).toBe(10);
    });

    it("calculates revenue from order item subtotals", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
          subtotal: "2500.00",
        }),
        createOrderItem({
          product_id: productId,
          subtotal: "3500.00",
        }),
        createOrderItem({
          product_id: productId,
          subtotal: "4000.00",
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.revenue).toBe(10000);
    });

    it("calculates conversion rate from distinct orders divided by views", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
          order_id: crypto.randomUUID(),
        }),
        createOrderItem({
          product_id: productId,
          order_id: crypto.randomUUID(),
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.conversionRate).toBe(0.4);
    });

    it("returns zero rates when there are no views", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.shared",
          product_id: productId,
        }),
        createEvent({
          event_name: "cart.item_added",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.conversionRate).toBe(0);
      expect(result.metrics.shareRate).toBe(0);
      expect(result.metrics.cartAddRate).toBe(0);
    });

    it("calculates share rate from shares divided by views", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.shared",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.shareRate).toBeCloseTo(1 / 3);
    });

    it("calculates cart add rate from cart additions divided by views", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
        }),
        createEvent({
          event_name: "cart.item_added",
          product_id: productId,
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.metrics.cartAddRate).toBeCloseTo(1 / 3);
    });

    it("filters behavioral events by the requested time range", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      const from = new Date("2026-09-01T00:00:00.000Z");
      const to = new Date("2026-09-02T00:00:00.000Z");

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
          occurred_at: new Date("2026-08-31T23:59:59.000Z"),
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
          occurred_at: new Date("2026-09-01T10:00:00.000Z"),
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
          occurred_at: new Date("2026-09-01T18:00:00.000Z"),
        }),
        createEvent({
          event_name: "product.viewed",
          product_id: productId,
          occurred_at: new Date("2026-09-02T00:00:00.001Z"),
        }),
      ]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
        from,
        to,
      });

      expect(result.metrics.views).toBe(2);
    });

    it("filters order items by the requested time range", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      const productId = crypto.randomUUID();

      const from = new Date("2026-09-01T00:00:00.000Z");
      const to = new Date("2026-09-02T00:00:00.000Z");

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);

      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([
        createOrderItem({
          product_id: productId,
          quantity: 10,
          subtotal: "10000.00",
          created_at: new Date("2026-08-31T23:59:59.000Z"),
        }),
        createOrderItem({
          product_id: productId,
          quantity: 2,
          subtotal: "2000.00",
          created_at: new Date("2026-09-01T10:00:00.000Z"),
        }),
        createOrderItem({
          product_id: productId,
          quantity: 3,
          subtotal: "3000.00",
          created_at: new Date("2026-09-01T18:00:00.000Z"),
        }),
        createOrderItem({
          product_id: productId,
          quantity: 20,
          subtotal: "20000.00",
          created_at: new Date("2026-09-02T00:00:00.001Z"),
        }),
      ]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const result = await engine.getProductMetrics({
        productId,
        from,
        to,
      });

      expect(result.metrics.unitsSold).toBe(5);
      expect(result.metrics.revenue).toBe(5000);
      expect(result.metrics.ordersContainingProduct).toBe(2);
    });

    it("uses the product id provided by the caller", async () => {
      const {
        eventRepository,
        orderRepository,
      } = createRepositories();

      vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);
      vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

      const engine = new InsightEngineImpl(
        eventRepository,
        orderRepository,
      );

      const productId = crypto.randomUUID();

      const result = await engine.getProductMetrics({
        productId,
      });

      expect(result.productId).toBe(productId);

      expect(
        eventRepository.findByProductId,
      ).toHaveBeenCalledWith(productId);

      expect(
        orderRepository.findItemsByProductId,
      ).toHaveBeenCalledWith(productId);
    });
  });
describe("input validation", () => {
  it("rejects a missing productId", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: undefined as unknown as string,
      }),
    ).rejects.toThrow("productId is required.");
  });

  it("rejects an empty productId", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: "   ",
      }),
    ).rejects.toThrow("productId is required.");
  });

  it("rejects an invalid from value", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        from: "2026-09-01" as unknown as Date,
      }),
    ).rejects.toThrow("from must be a valid Date.");
  });

  it("rejects an invalid to value", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        to: "2026-09-02" as unknown as Date,
      }),
    ).rejects.toThrow("to must be a valid Date.");
  });

  it("rejects a from date that is equal to the to date", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    const date = new Date("2026-09-01T00:00:00.000Z");

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        from: date,
        to: date,
      }),
    ).rejects.toThrow("from must be before to.");
  });

  it("rejects a from date that is after the to date", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        from: new Date("2026-09-03T00:00:00.000Z"),
        to: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).rejects.toThrow("from must be before to.");
  });

  it("accepts a from date without a to date", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);
    vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        from: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).resolves.toBeDefined();
  });

  it("accepts a to date without a from date", async () => {
    const {
      eventRepository,
      orderRepository,
    } = createRepositories();

    vi.mocked(eventRepository.findByProductId).mockResolvedValue([]);
    vi.mocked(orderRepository.findItemsByProductId).mockResolvedValue([]);

    const engine = new InsightEngineImpl(
      eventRepository,
      orderRepository,
    );

    await expect(
      engine.getProductMetrics({
        productId: crypto.randomUUID(),
        to: new Date("2026-09-02T00:00:00.000Z"),
      }),
    ).resolves.toBeDefined();
  });
});

});
