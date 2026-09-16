import { describe, expect, it } from "vitest";

import {
  ProductInsightRules,
} from "../../src/insights/rules/product.insight.rules.js";

import {
  ProductInsightMetrics,
} from "../../src/insights/insight.engine.js";

function createMetrics(
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

describe("ProductInsightRules", () => {
  it("returns no insight when there is no activity", () => {
    const metrics = createMetrics();

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toEqual([]);
  });

  it("detects low product conversion", () => {
    const metrics = createMetrics({
      views: 100,
      ordersContainingProduct: 1,
      conversionRate: 0.009,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "PRODUCT_LOW_CONVERSION",
      severity: "warning",
      message: "Ce produit reçoit des vues mais convertit peu.",
    });
  });

  it("does not report low conversion when the conversion rate is exactly 1%", () => {
    const metrics = createMetrics({
      views: 100,
      ordersContainingProduct: 1,
      conversionRate: 0.01,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "PRODUCT_LOW_CONVERSION",
      severity: "warning",
      message: "Ce produit reçoit des vues mais convertit peu.",
    });
  });

  it("detects strong product conversion", () => {
    const metrics = createMetrics({
      views: 100,
      ordersContainingProduct: 5,
      conversionRate: 0.05,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "PRODUCT_STRONG_CONVERSION",
      severity: "positive",
      message: "Ce produit transforme efficacement ses vues en commandes.",
    });
  });

  it("does not report strong conversion with fewer than 10 views", () => {
    const metrics = createMetrics({
      views: 9,
      ordersContainingProduct: 1,
      conversionRate: 1 / 9,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "PRODUCT_STRONG_CONVERSION",
      severity: "positive",
      message: "Ce produit transforme efficacement ses vues en commandes.",
    });
  });

  it("detects low cart add rate", () => {
    const metrics = createMetrics({
      views: 100,
      cartAdds: 1,
      cartAddRate: 0.01,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "PRODUCT_LOW_CART_ADD_RATE",
      severity: "warning",
      message: "Ce produit reçoit des vues mais génère peu d'ajouts au panier.",
    });
  });

  it("does not report low cart add rate at exactly 2%", () => {
    const metrics = createMetrics({
      views: 100,
      cartAdds: 2,
      cartAddRate: 0.02,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "PRODUCT_LOW_CART_ADD_RATE",
      severity: "warning",
      message: "Ce produit reçoit des vues mais génère peu d'ajouts au panier.",
    });
  });

  it("detects high share rate", () => {
    const metrics = createMetrics({
      views: 100,
      shares: 10,
      shareRate: 0.1,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "PRODUCT_HIGH_SHARE_RATE",
      severity: "positive",
      message: "Ce produit est fortement partagé par les visiteurs.",
    });
  });

  it("does not report high share rate below 10%", () => {
    const metrics = createMetrics({
      views: 100,
      shares: 9,
      shareRate: 0.09,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "PRODUCT_HIGH_SHARE_RATE",
      severity: "positive",
      message: "Ce produit est fortement partagé par les visiteurs.",
    });
  });

  it("can return multiple independent insights", () => {
    const metrics = createMetrics({
      views: 100,
      shares: 15,
      cartAdds: 1,
      ordersContainingProduct: 1,
      shareRate: 0.15,
      cartAddRate: 0.01,
      conversionRate: 0.009,
    });

    const insights = ProductInsightRules.evaluate(metrics);

    expect(insights).toHaveLength(3);

    expect(
      insights.map((insight) => insight.code),
    ).toEqual([
      "PRODUCT_LOW_CONVERSION",
      "PRODUCT_LOW_CART_ADD_RATE",
      "PRODUCT_HIGH_SHARE_RATE",
    ]);
  });
});
