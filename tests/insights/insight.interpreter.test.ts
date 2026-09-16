import { describe, expect, it, vi } from "vitest";

import {
  InsightInterpreter,
} from "../../src/insights/insight.interpreter.js";

import {
  Insight,
  ProductInsightMetrics,
} from "../../src/insights/insight.engine.js";

import {
  InsightMetrics,
} from "../../src/insights/insight-calculator.js";

function createStoreMetrics(
  overrides: Partial<InsightMetrics> = {},
): InsightMetrics {
  return {
    views: 0,
    shares: 0,
    cartAdds: 0,
    orders: 0,
    confirmedOrders: 0,
    cancelledOrders: 0,
    deliveredOrders: 0,
    conversionRate: 0,
    shareRate: 0,
    cartToOrderRate: 0,
    cancellationRate: 0,
    confirmationRate: 0,
    deliveryRate: 0,
    ...overrides,
  };
}

function createProductMetrics(
  overrides: Partial<ProductInsightMetrics> = {},
): ProductInsightMetrics {
  return {
    views: 0,
    shares: 0,
    cartAdds: 0,
    ordersContainingProduct: 0,
    unitsSold: 0,
    revenue: 0,
    conversionRate: 0,
    shareRate: 0,
    cartAddRate: 0,
    ...overrides,
  };
}

describe("InsightInterpreter", () => {
  it("returns store insights from store metrics", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createStoreMetrics({
      views: 100,
      orders: 1,
      conversionRate: 0.009,
    });

    const insights = interpreter.interpretStore(metrics);

    expect(insights).toContainEqual({
      code: "STORE_LOW_CONVERSION",
      severity: "warning",
      message:
        "La boutique reçoit des visites mais convertit peu en commandes.",
    });
  });

  it("returns product insights from product metrics", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createProductMetrics({
      views: 100,
      ordersContainingProduct: 1,
      conversionRate: 0.009,
    });

    const insights = interpreter.interpretProduct(metrics);

    expect(insights).toContainEqual({
      code: "PRODUCT_LOW_CONVERSION",
      severity: "warning",
      message:
        "Ce produit reçoit des vues mais convertit peu.",
    });
  });

  it("returns an empty array when store metrics produce no insight", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createStoreMetrics();

    const insights = interpreter.interpretStore(metrics);

    expect(insights).toEqual([]);
  });

  it("returns an empty array when product metrics produce no insight", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createProductMetrics();

    const insights = interpreter.interpretProduct(metrics);

    expect(insights).toEqual([]);
  });

  it("can return multiple store insights", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createStoreMetrics({
      views: 100,
      orders: 10,
      confirmedOrders: 10,
      cancelledOrders: 2,
      deliveredOrders: 8,
      conversionRate: 0.1,
      cancellationRate: 0.2,
      deliveryRate: 0.8,
    });

    const insights = interpreter.interpretStore(metrics);

    expect(insights).toHaveLength(3);

    expect(insights.map((insight) => insight.code)).toEqual([
      "STORE_STRONG_CONVERSION",
      "STORE_HIGH_CANCELLATION_RATE",
      "STORE_STRONG_DELIVERY_RATE",
    ]);
  });

  it("can return multiple product insights", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createProductMetrics({
      views: 100,
      shares: 15,
      cartAdds: 1,
      ordersContainingProduct: 1,
      shareRate: 0.15,
      cartAddRate: 0.01,
      conversionRate: 0.009,
    });

    const insights = interpreter.interpretProduct(metrics);

    expect(insights).toHaveLength(3);

    expect(insights.map((insight) => insight.code)).toEqual([
      "PRODUCT_LOW_CONVERSION",
      "PRODUCT_LOW_CART_ADD_RATE",
      "PRODUCT_HIGH_SHARE_RATE",
    ]);
  });

  it("does not modify the store metrics", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createStoreMetrics({
      views: 100,
      orders: 5,
      conversionRate: 0.05,
    });

    const original = structuredClone(metrics);

    interpreter.interpretStore(metrics);

    expect(metrics).toEqual(original);
  });

  it("does not modify the product metrics", () => {
    const interpreter = new InsightInterpreter();

    const metrics = createProductMetrics({
      views: 100,
      ordersContainingProduct: 5,
      conversionRate: 0.05,
    });

    const original = structuredClone(metrics);

    interpreter.interpretProduct(metrics);

    expect(metrics).toEqual(original);
  });
});