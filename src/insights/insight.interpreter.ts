import { Insight, InsightMetrics, ProductInsightMetrics } from "./insight.types.js";

import {
  ProductInsightRules,
} from "./rules/product.insight.rules.js";

import {
  StoreInsightRules,
} from "./rules/store.insight.rules.js";

export class InsightInterpreter {
  interpretStore(
    metrics: InsightMetrics,
  ): Insight[] {
    return StoreInsightRules.evaluate(metrics);
  }

  interpretProduct(
    metrics: ProductInsightMetrics,
  ): Insight[] {
    return ProductInsightRules.evaluate(metrics);
  }
}
