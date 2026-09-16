import { ProductInsightRules, } from "./rules/product.insight.rules.js";
import { StoreInsightRules, } from "./rules/store.insight.rules.js";
export class InsightInterpreter {
    interpretStore(metrics) {
        return StoreInsightRules.evaluate(metrics);
    }
    interpretProduct(metrics) {
        return ProductInsightRules.evaluate(metrics);
    }
}
