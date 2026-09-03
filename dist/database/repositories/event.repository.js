import db from "../knex.js";
export class EventRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("events").where({ id }).first();
    }
    async findByEventKey(eventKey) {
        return this.database("events")
            .where({ event_key: eventKey })
            .first();
    }
    async findBySessionId(sessionId) {
        return this.database("events")
            .where({ session_id: sessionId })
            .orderBy("occurred_at", "desc");
    }
    async findByUserId(userId) {
        return this.database("events")
            .where({ user_id: userId })
            .orderBy("occurred_at", "desc");
    }
    async findByStoreId(storeId) {
        return this.database("events")
            .where({ store_id: storeId })
            .orderBy("occurred_at", "desc");
    }
    async findByProductId(productId) {
        return this.database("events")
            .where({ product_id: productId })
            .orderBy("occurred_at", "desc");
    }
    async findByOrderId(orderId) {
        return this.database("events")
            .where({ order_id: orderId })
            .orderBy("occurred_at", "desc");
    }
    async create(data) {
        const [event] = await this.database("events")
            .insert({
            event_name: data.event_name,
            event_key: data.event_key ?? null,
            session_id: data.session_id ?? null,
            user_id: data.user_id ?? null,
            store_id: data.store_id ?? null,
            product_id: data.product_id ?? null,
            order_id: data.order_id ?? null,
            metadata: data.metadata ?? {},
            ...(data.occurred_at
                ? {
                    occurred_at: data.occurred_at,
                }
                : {}),
        })
            .returning("*");
        return event;
    }
}
