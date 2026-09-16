export interface Insight {
  code: string;
  severity: "info" | "warning" | "positive";
  message: string;
}

export interface InsightMetrics {
  views: number;
  shares: number;
  cartAdds: number;
  orders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  conversionRate: number;
  shareRate: number;
  cartToOrderRate: number;
  cancellationRate: number;
  confirmationRate: number;
  deliveryRate: number;
}

export interface ProductInsightMetrics {
  views: number;
  shares: number;
  cartAdds: number;
  ordersContainingProduct: number;
  unitsSold: number;
  revenue: number;
  conversionRate: number;
  shareRate: number;
  cartAddRate: number;
}

export interface ProductInsight {
  productId: string;
  metrics: ProductInsightMetrics;
}

export interface GetProductMetricsOptions {
  productId: string;
  from?: Date;
  to?: Date;
}
