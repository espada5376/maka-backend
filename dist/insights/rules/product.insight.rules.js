export class ProductInsightRules {
    static evaluate(metrics) {
        const insights = [];
        if (metrics.views > 0 &&
            metrics.conversionRate < 0.01) {
            insights.push({
                code: "PRODUCT_LOW_CONVERSION",
                severity: "warning",
                message: "Ce produit reçoit des vues mais convertit peu.",
            });
        }
        if (metrics.views >= 10 &&
            metrics.conversionRate >= 0.05) {
            insights.push({
                code: "PRODUCT_STRONG_CONVERSION",
                severity: "positive",
                message: "Ce produit transforme efficacement ses vues en commandes.",
            });
        }
        if (metrics.views >= 10 &&
            metrics.cartAddRate < 0.02) {
            insights.push({
                code: "PRODUCT_LOW_CART_ADD_RATE",
                severity: "warning",
                message: "Ce produit reçoit des vues mais génère peu d'ajouts au panier.",
            });
        }
        if (metrics.views >= 10 &&
            metrics.shareRate >= 0.10) {
            insights.push({
                code: "PRODUCT_HIGH_SHARE_RATE",
                severity: "positive",
                message: "Ce produit est fortement partagé par les visiteurs.",
            });
        }
        return insights;
    }
}
