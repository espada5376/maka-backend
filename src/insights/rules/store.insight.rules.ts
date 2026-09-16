import { Insight, InsightMetrics, } from "../insight.types.js";

export class StoreInsightRules {
  static evaluate(
    metrics: InsightMetrics,
  ): Insight[] {
    const insights: Insight[] = [];

    if (
      metrics.views > 0 &&
      metrics.conversionRate < 0.01
    ) {
      insights.push({
        code: "STORE_LOW_CONVERSION",
        severity: "warning",
        message:
          "La boutique reçoit des visites mais convertit peu en commandes.",
      });
    }

    if (
      metrics.views >= 10 &&
      metrics.conversionRate >= 0.05
    ) {
      insights.push({
        code: "STORE_STRONG_CONVERSION",
        severity: "positive",
        message:
          "La boutique transforme efficacement ses visites en commandes.",
      });
    }

    if (
      metrics.orders > 0 &&
      metrics.cancellationRate >= 0.20
    ) {
      insights.push({
        code: "STORE_HIGH_CANCELLATION_RATE",
        severity: "warning",
        message:
          "Une part importante des commandes est annulée.",
      });
    }

    if (
      metrics.confirmedOrders > 0 &&
      metrics.deliveryRate >= 0.80
    ) {
      insights.push({
        code: "STORE_STRONG_DELIVERY_RATE",
        severity: "positive",
        message:
          "La boutique livre efficacement les commandes confirmées.",
      });
    }

    return insights;
  }
}
