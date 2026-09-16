
import { describe, expect, it } from "vitest";

import type {
  Insight,
  InsightMetrics,
  ProductInsightMetrics,
  ProductInsight,
  GetProductMetricsOptions,
} from "../../src/insights/insight.types.js";

describe("Insight types", () => {
  it("définit correctement un Insight", () => {
    const insight: Insight = {
      code: "PRODUCT_LOW_CONVERSION",
      severity: "warning",
      message: "Ce produit reçoit des vues mais convertit peu.",
    };

    expect(insight.code).toBe("PRODUCT_LOW_CONVERSION");
    expect(insight.severity).toBe("warning");
    expect(insight.message).toBe(
      "Ce produit reçoit des vues mais convertit peu.",
    );
  });

  it("définit correctement les métriques d'une boutique", () => {
    const metrics: InsightMetrics = {
      views: 100,
      shares: 20,
      cartAdds: 15,
      orders: 5,
      confirmedOrders: 4,
      cancelledOrders: 1,
      deliveredOrders: 3,
      conversionRate: 0.05,
      shareRate: 0.2,
      cartToOrderRate: 1 / 3,
      cancellationRate: 0.2,
      confirmationRate: 0.8,
      deliveryRate: 0.6,
    };

    expect(metrics.views).toBe(100);
    expect(metrics.orders).toBe(5);
    expect(metrics.conversionRate).toBe(0.05);
  });

  it("définit correctement les métriques d'un produit", () => {
    const metrics: ProductInsightMetrics = {
      views: 100,
      shares: 20,
      cartAdds: 10,
      ordersContainingProduct: 5,
      unitsSold: 8,
      revenue: 40000,
      conversionRate: 0.05,
      shareRate: 0.2,
      cartAddRate: 0.1,
    };

    expect(metrics.views).toBe(100);
    expect(metrics.ordersContainingProduct).toBe(5);
    expect(metrics.unitsSold).toBe(8);
    expect(metrics.revenue).toBe(40000);
  });

  it("définit correctement un ProductInsight", () => {
    const productInsight: ProductInsight = {
      productId: "product-1",
      metrics: {
        views: 100,
        shares: 20,
        cartAdds: 10,
        ordersContainingProduct: 5,
        unitsSold: 8,
        revenue: 40000,
        conversionRate: 0.05,
        shareRate: 0.2,
        cartAddRate: 0.1,
      },
    };

    expect(productInsight.productId).toBe("product-1");
    expect(productInsight.metrics.ordersContainingProduct).toBe(5);
  });

  it("définit correctement les options de métriques produit", () => {
    const options: GetProductMetricsOptions = {
      productId: "product-1",
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-02-01T00:00:00.000Z"),
    };

    expect(options.productId).toBe("product-1");
    expect(options.from).toBeInstanceOf(Date);
    expect(options.to).toBeInstanceOf(Date);
  });

  it("permet une période optionnelle", () => {
    const options: GetProductMetricsOptions = {
      productId: "product-1",
    };

    expect(options.productId).toBe("product-1");
    expect(options.from).toBeUndefined();
    expect(options.to).toBeUndefined();
  });
});

