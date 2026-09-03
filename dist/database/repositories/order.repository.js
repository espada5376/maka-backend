import db from "../knex.js";
export class OrderRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("orders").where({ id }).first();
    }
    async findByReference(reference) {
        return this.database("orders").where({ reference }).first();
    }
    async findByIdempotencyKey(idempotencyKey) {
        return this.database("orders")
            .where({
            idempotency_key: idempotencyKey,
        })
            .first();
    }
    async findBySessionId(sessionId) {
        return this.database("orders")
            .where({
            session_id: sessionId,
        })
            .orderBy("created_at", "desc");
    }
    async findByBuyerUserId(buyerUserId) {
        return this.database("orders")
            .where({
            buyer_user_id: buyerUserId,
        })
            .orderBy("created_at", "desc");
    }
    async findByStoreId(storeId) {
        return this.database("orders")
            .where({
            store_id: storeId,
        })
            .orderBy("created_at", "desc");
    }
    async create(data) {
        const [order] = await this.database("orders")
            .insert({
            reference: data.reference,
            idempotency_key: data.idempotency_key,
            store_id: data.store_id,
            buyer_user_id: data.buyer_user_id ?? null,
            session_id: data.session_id,
            status: data.status ?? "pending",
            total_amount: data.total_amount,
            currency: data.currency,
            buyer_phone: data.buyer_phone,
            delivery_country: data.delivery_country,
            delivery_city: data.delivery_city,
            delivery_address: data.delivery_address,
        })
            .returning("*");
        return order;
    }
    async updateStatus(id, status) {
        const [order] = await this.database("orders")
            .where({ id })
            .update({
            status,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return order;
    }
    async findItems(orderId) {
        return this.database("order_items")
            .where({
            order_id: orderId,
        })
            .orderBy("created_at", "asc");
    }
    async createItem(data) {
        const [item] = await this.database("order_items")
            .insert({
            order_id: data.order_id,
            product_id: data.product_id,
            product_name: data.product_name,
            unit_price: data.unit_price,
            quantity: data.quantity,
            subtotal: data.subtotal,
        })
            .returning("*");
        return item;
    }
    async createItems(items) {
        if (items.length === 0) {
            return [];
        }
        return this.database("order_items").insert(items).returning("*");
    }
}
