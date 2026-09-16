import { EventRepository, } from "../database/repositories/event.repository.js";
import { OrderRepository, } from "../database/repositories/order.repository.js";
export class InsightEngineImpl {
    eventRepository;
    orderRepository;
    constructor(eventRepository = new EventRepository(), orderRepository = new OrderRepository()) {
        this.eventRepository = eventRepository;
        this.orderRepository = orderRepository;
    }
    async getProductMetrics(options) {
        this.validateOptions(options);
        const events = await this.eventRepository.findByProductId(options.productId);
        const orderItems = await this.orderRepository.findItemsByProductId(options.productId);
        const filteredEvents = this.filterEvents(events, options.from, options.to);
        const filteredOrderItems = this.filterOrderItems(orderItems, options.from, options.to);
        const views = this.countEvents(filteredEvents, "product.viewed");
        const shares = this.countEvents(filteredEvents, "product.shared");
        const cartAdds = this.countEvents(filteredEvents, "cart.item_added");
        const ordersContainingProduct = this.countDistinctOrders(filteredOrderItems);
        const unitsSold = this.sumQuantity(filteredOrderItems);
        const revenue = this.sumRevenue(filteredOrderItems);
        const conversionRate = this.calculateRate(ordersContainingProduct, views);
        const shareRate = this.calculateRate(shares, views);
        const cartAddRate = this.calculateRate(cartAdds, views);
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
    validateOptions(options) {
        if (!options || typeof options !== "object") {
            throw new Error("Insight options are required.");
        }
        if (typeof options.productId !== "string" ||
            options.productId.trim().length === 0) {
            throw new Error("productId is required.");
        }
        if (options.from !== undefined &&
            !(options.from instanceof Date)) {
            throw new Error("from must be a valid Date.");
        }
        if (options.to !== undefined &&
            !(options.to instanceof Date)) {
            throw new Error("to must be a valid Date.");
        }
        if (options.from &&
            options.to &&
            options.from >= options.to) {
            throw new Error("from must be before to.");
        }
    }
    filterEvents(events, from, to) {
        return events.filter((event) => this.isWithinRange(event.occurred_at, from, to));
    }
    filterOrderItems(orderItems, from, to) {
        return orderItems.filter((item) => this.isWithinRange(item.created_at, from, to));
    }
    isWithinRange(date, from, to) {
        if (from && date < from) {
            return false;
        }
        if (to && date >= to) {
            return false;
        }
        return true;
    }
    countEvents(events, eventName) {
        return events.filter((event) => event.event_name === eventName).length;
    }
    countDistinctOrders(orderItems) {
        const orderIds = new Set();
        for (const item of orderItems) {
            orderIds.add(item.order_id);
        }
        return orderIds.size;
    }
    sumQuantity(orderItems) {
        return orderItems.reduce((total, item) => total + item.quantity, 0);
    }
    sumRevenue(orderItems) {
        return orderItems.reduce((total, item) => total + Number(item.subtotal), 0);
    }
    calculateRate(numerator, denominator) {
        if (denominator === 0) {
            return 0;
        }
        return numerator / denominator;
    }
}
