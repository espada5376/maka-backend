const EVENT_NAMES = {
    PRODUCT_VIEWED: "product.viewed",
    PRODUCT_SHARED: "product.shared",
    CART_ITEM_ADDED: "cart.item_added",
    ORDER_CREATED: "order.created",
    ORDER_CONFIRMED: "order.confirmed",
    ORDER_CANCELLED: "order.cancelled",
    ORDER_DELIVERED: "order.delivered",
};
export class InsightCalculator {
    calculate(events) {
        const views = this.count(events, EVENT_NAMES.PRODUCT_VIEWED);
        const shares = this.count(events, EVENT_NAMES.PRODUCT_SHARED);
        const cartAdds = this.count(events, EVENT_NAMES.CART_ITEM_ADDED);
        const orders = this.count(events, EVENT_NAMES.ORDER_CREATED);
        const confirmedOrders = this.count(events, EVENT_NAMES.ORDER_CONFIRMED);
        const cancelledOrders = this.count(events, EVENT_NAMES.ORDER_CANCELLED);
        const deliveredOrders = this.count(events, EVENT_NAMES.ORDER_DELIVERED);
        return {
            views,
            shares,
            cartAdds,
            orders,
            confirmedOrders,
            cancelledOrders,
            deliveredOrders,
            conversionRate: this.rate(orders, views),
            shareRate: this.rate(shares, views),
            cartToOrderRate: this.rate(orders, cartAdds),
            cancellationRate: this.rate(cancelledOrders, orders),
            confirmationRate: this.rate(confirmedOrders, orders),
            deliveryRate: this.rate(deliveredOrders, orders),
        };
    }
    count(events, eventName) {
        return events.filter((event) => event.event_name === eventName).length;
    }
    rate(numerator, denominator) {
        if (denominator === 0) {
            return 0;
        }
        return numerator / denominator;
    }
}
