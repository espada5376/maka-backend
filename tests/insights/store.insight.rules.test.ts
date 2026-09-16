import { describe, expect, it } from "vitest";

import {
  StoreInsightRules,
} from "../../src/insights/rules/store.insight.rules.js";

import {
  InsightMetrics,
} from "../../src/insights/insight.calculator.js";

function createMetrics(
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

describe("StoreInsightRules", () => {
  it("returns no insight when there is no activity", () => {
    const metrics = createMetrics();

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toEqual([]);
  });

  it("detects low store conversion", () => {
    const metrics = createMetrics({
      views: 100,
      orders: 1,
      conversionRate: 0.009,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "STORE_LOW_CONVERSION",
      severity: "warning",
      message: "La boutique reçoit des visites mais convertit peu en commandes.",
    });
  });

  it("does not report low conversion at exactly 1%", () => {
    const metrics = createMetrics({
      views: 100,
      orders: 1,
      conversionRate: 0.01,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "STORE_LOW_CONVERSION",
      severity: "warning",
      message: "La boutique reçoit des visites mais convertit peu en commandes.",
    });
  });

  it("detects strong store conversion", () => {
    const metrics = createMetrics({
      views: 100,
      orders: 5,
      conversionRate: 0.05,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "STORE_STRONG_CONVERSION",
      severity: "positive",
      message: "La boutique transforme efficacement ses visites en commandes.",
    });
  });

  it("detects high cancellation rate", () => {
    const metrics = createMetrics({
      orders: 10,
      cancelledOrders: 2,
      cancellationRate: 0.2,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "STORE_HIGH_CANCELLATION_RATE",
      severity: "warning",
      message: "Une part importante des commandes est annulée.",
    });
  });

  it("does not report high cancellation rate below 20%", () => {
    const metrics = createMetrics({
      orders: 10,
      cancelledOrders: 1,
      cancellationRate: 0.1,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "STORE_HIGH_CANCELLATION_RATE",
      severity: "warning",
      message: "Une part importante des commandes est annulée.",
    });
  });

  it("detects strong delivery rate", () => {
    const metrics = createMetrics({
      confirmedOrders: 10,
      deliveredOrders: 8,
      deliveryRate: 0.8,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toContainEqual({
      code: "STORE_STRONG_DELIVERY_RATE",
      severity: "positive",
      message: "La boutique livre efficacement les commandes confirmées.",
    });
  });

  it("does not report strong delivery rate below 80%", () => {
    const metrics = createMetrics({
      confirmedOrders: 10,
      deliveredOrders: 7,
      deliveryRate: 0.7,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).not.toContainEqual({
      code: "STORE_STRONG_DELIVERY_RATE",
      severity: "positive",
      message: "La boutique livre efficacement les commandes confirmées.",
    });
  });

  it("can return multiple independent insights", () => {
    const metrics = createMetrics({
      views: 100,
      orders: 10,
      confirmedOrders: 10,
      cancelledOrders: 2,
      deliveredOrders: 8,
      conversionRate: 0.1,
      cancellationRate: 0.2,
      deliveryRate: 0.8,
    });

    const insights = StoreInsightRules.evaluate(metrics);

    expect(insights).toHaveLength(3);

    expect(
      insights.map((insight) => insight.code),
    ).toEqual([
      "STORE_STRONG_CONVERSION",
      "STORE_HIGH_CANCELLATION_RATE",
      "STORE_STRONG_DELIVERY_RATE",
    ]);
  });
});
