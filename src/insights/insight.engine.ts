import {
  Event,
  EventRepository,
} from "../database/repositories/event.repository.js";

import {
  OrderItem,
  OrderRepository,
} from "../database/repositories/order.repository.js";

export interface Insight {
  code: string;
  severity: "info" | "warning" | "positive";
  message: string;
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

export interface InsightEngine {
  getProductMetrics(
    options: GetProductMetricsOptions,
  ): Promise<ProductInsight>;
}

export class InsightEngineImpl implements InsightEngine {
  constructor(
    private readonly eventRepository: EventRepository = new EventRepository(),
    private readonly orderRepository: OrderRepository = new OrderRepository(),
  ) {}

  async getProductMetrics(
    options: GetProductMetricsOptions,
  ): Promise<ProductInsight> {
    this.validateOptions(options);

    const events = await this.eventRepository.findByProductId(
      options.productId,
    );

    const orderItems =
      await this.orderRepository.findItemsByProductId(
        options.productId,
      );

    const filteredEvents = this.filterEvents(
      events,
      options.from,
      options.to,
    );

    const filteredOrderItems = this.filterOrderItems(
      orderItems,
      options.from,
      options.to,
    );

    const views = this.countEvents(
      filteredEvents,
      "product.viewed",
    );

    const shares = this.countEvents(
      filteredEvents,
      "product.shared",
    );

    const cartAdds = this.countEvents(
      filteredEvents,
      "cart.item_added",
    );

    const ordersContainingProduct =
      this.countDistinctOrders(filteredOrderItems);

    const unitsSold = this.sumQuantity(filteredOrderItems);

    const revenue = this.sumRevenue(filteredOrderItems);

    const conversionRate = this.calculateRate(
      ordersContainingProduct,
      views,
    );

    const shareRate = this.calculateRate(
      shares,
      views,
    );

    const cartAddRate = this.calculateRate(
      cartAdds,
      views,
    );

    return {
      productId: options.productId,
      metrics: {
        views,
        shares,
        cartAdds,
        ordersContainingProduct,
        unitsSold,
        revenue,
        conversionRate,
        shareRate,
        cartAddRate,
      },
    };
  }

  private validateOptions(
    options: GetProductMetricsOptions,
  ): void {
    if (!options || typeof options !== "object") {
      throw new Error("Insight options are required.");
    }

    if (
      typeof options.productId !== "string" ||
      options.productId.trim().length === 0
    ) {
      throw new Error("productId is required.");
    }

    if (
      options.from !== undefined &&
      !(options.from instanceof Date)
    ) {
      throw new Error("from must be a valid Date.");
    }

    if (
      options.to !== undefined &&
      !(options.to instanceof Date)
    ) {
      throw new Error("to must be a valid Date.");
    }

    if (
      options.from &&
      options.to &&
      options.from >= options.to
    ) {
      throw new Error("from must be before to.");
    }
  }

  private filterEvents(
    events: Event[],
    from?: Date,
    to?: Date,
  ): Event[] {
    return events.filter((event) =>
      this.isWithinRange(
        event.occurred_at,
        from,
        to,
      ),
    );
  }

  private filterOrderItems(
    orderItems: OrderItem[],
    from?: Date,
    to?: Date,
  ): OrderItem[] {
    return orderItems.filter((item) =>
      this.isWithinRange(
        item.created_at,
        from,
        to,
      ),
    );
  }

  private isWithinRange(
    date: Date,
    from?: Date,
    to?: Date,
  ): boolean {
    if (from && date < from) {
      return false;
    }

    if (to && date >= to) {
      return false;
    }

    return true;
  }

  private countEvents(
    events: Event[],
    eventName: string,
  ): number {
    return events.filter(
      (event) => event.event_name === eventName,
    ).length;
  }

  private countDistinctOrders(
    orderItems: OrderItem[],
  ): number {
    const orderIds = new Set<string>();

    for (const item of orderItems) {
      orderIds.add(item.order_id);
    }

    return orderIds.size;
  }

  private sumQuantity(
    orderItems: OrderItem[],
  ): number {
    return orderItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }

  private sumRevenue(
    orderItems: OrderItem[],
  ): number {
    return orderItems.reduce(
      (total, item) => total + Number(item.subtotal),
      0,
    );
  }

  private calculateRate(
    numerator: number,
    denominator: number,
  ): number {
    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }
}
