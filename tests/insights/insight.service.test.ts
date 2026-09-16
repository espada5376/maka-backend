import { describe, expect, it, vi } from "vitest";

import {
  InsightService,
} from "../../src/insights/insight.service.js";

import {
  Event,
  EventRepository,
} from "../../src/database/repositories/event.repository.js";

import {
  InsightEngine,
  ProductInsight,
} from "../../src/insights/insight.engine.js";

import {
  InsightInterpreter,
} from "../../src/insights/insight.interpreter.js";

function createEvent(
  overrides: Partial<Event> = {},
): Event {
  return {
    id: "event-1",
    event_name: "store.viewed",
    event_key: null,
    session_id: "session-1",
    user_id: null,
    store_id: "store-1",
    product_id: null,
    order_id: null,
    metadata: {},
    occurred_at: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

describe("InsightService", () => {
  it("returns store insights from store events", async () => {
    const eventRepository = {
      findByStoreId: vi.fn().mockResolvedValue([
        createEvent({
          event_name: "store.viewed",
        }),
        createEvent({
          id: "event-2",
          event_name: "order.created",
        }),
      ]),
    } as unknown as EventRepository;

    const insightEngine = {} as InsightEngine;

    const interpreter = {
      interpretStore: vi.fn().mockReturnValue([
        {
          code: "STORE_LOW_CONVERSION",
          severity: "warning",
          message:
            "La boutique reçoit des visites mais convertit peu en commandes.",
        },
      ]),
      interpretProduct: vi.fn(),
    } as unknown as InsightInterpreter;

    const service = new InsightService(
      eventRepository,
      insightEngine,
      interpreter,
    );

    const insights = await service.getStoreInsights("store-1");

    expect(eventRepository.findByStoreId).toHaveBeenCalledWith(
      "store-1",
    );

    expect(interpreter.interpretStore).toHaveBeenCalledOnce();

    expect(insights).toEqual([
      {
        code: "STORE_LOW_CONVERSION",
        severity: "warning",
        message:
          "La boutique reçoit des visites mais convertit peu en commandes.",
      },
    ]);
  });

  it("returns product insights from product metrics", async () => {
    const eventRepository = {} as EventRepository;

    const productMetrics: ProductInsight = {
      productId: "product-1",
      metrics: {
        views: 100,
        shares: 10,
        cartAdds: 5,
        ordersContainingProduct: 5,
        unitsSold: 5,
        revenue: 5000,
        conversionRate: 0.05,
        shareRate: 0.1,
        cartAddRate: 0.05,
      },
    };

    const insightEngine = {
      getProductMetrics: vi.fn().mockResolvedValue(
        productMetrics,
      ),
    } as unknown as InsightEngine;

    const interpreter = {
      interpretStore: vi.fn(),
      interpretProduct: vi.fn().mockReturnValue([
        {
          code: "PRODUCT_STRONG_CONVERSION",
          severity: "positive",
          message:
            "Ce produit transforme efficacement ses vues en commandes.",
        },
      ]),
    } as unknown as InsightInterpreter;

    const service = new InsightService(
      eventRepository,
      insightEngine,
      interpreter,
    );

    const insights = await service.getProductInsights({
      productId: "product-1",
    });

    expect(
      insightEngine.getProductMetrics,
    ).toHaveBeenCalledWith({
      productId: "product-1",
    });

    expect(
      interpreter.interpretProduct,
    ).toHaveBeenCalledWith(productMetrics.metrics);

    expect(insights).toEqual([
      {
        code: "PRODUCT_STRONG_CONVERSION",
        severity: "positive",
        message:
          "Ce produit transforme efficacement ses vues en commandes.",
      },
    ]);
  });

  it("passes the date range to product metrics", async () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-02-01T00:00:00Z");

    const eventRepository = {} as EventRepository;

    const productMetrics: ProductInsight = {
      productId: "product-1",
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
    };

    const insightEngine = {
      getProductMetrics: vi.fn().mockResolvedValue(
        productMetrics,
      ),
    } as unknown as InsightEngine;

    const interpreter = {
      interpretStore: vi.fn(),
      interpretProduct: vi.fn().mockReturnValue([]),
    } as unknown as InsightInterpreter;

    const service = new InsightService(
      eventRepository,
      insightEngine,
      interpreter,
    );

    await service.getProductInsights({
      productId: "product-1",
      from,
      to,
    });

    expect(
      insightEngine.getProductMetrics,
    ).toHaveBeenCalledWith({
      productId: "product-1",
      from,
      to,
    });
  });

  it("returns an empty array when the store has no events", async () => {
    const eventRepository = {
      findByStoreId: vi.fn().mockResolvedValue([]),
    } as unknown as EventRepository;

    const insightEngine = {} as InsightEngine;

    const interpreter = {
      interpretStore: vi.fn().mockReturnValue([]),
      interpretProduct: vi.fn(),
    } as unknown as InsightInterpreter;

    const service = new InsightService(
      eventRepository,
      insightEngine,
      interpreter,
    );

    const insights = await service.getStoreInsights("store-1");

    expect(insights).toEqual([]);

    expect(interpreter.interpretStore).toHaveBeenCalledOnce();
  });

  it("returns an empty array when the product has no insights", async () => {
    const eventRepository = {} as EventRepository;

    const productMetrics: ProductInsight = {
      productId: "product-1",
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
    };

    const insightEngine = {
      getProductMetrics: vi.fn().mockResolvedValue(
        productMetrics,
      ),
    } as unknown as InsightEngine;

    const interpreter = {
      interpretStore: vi.fn(),
      interpretProduct: vi.fn().mockReturnValue([]),
    } as unknown as InsightInterpreter;

    const service = new InsightService(
      eventRepository,
      insightEngine,
      interpreter,
    );

    const insights = await service.getProductInsights({
      productId: "product-1",
    });

    expect(insights).toEqual([]);
  });
});
