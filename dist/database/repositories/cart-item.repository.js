import db from "../knex.js";
export class CartItemRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("cart_items").where({ id }).first();
    }
    async findByCartId(cartId) {
        return this.database("cart_items")
            .where({ cart_id: cartId })
            .orderBy("created_at", "asc");
    }
    async findByCartAndProduct(cartId, productId) {
        return this.database("cart_items")
            .where({
            cart_id: cartId,
            product_id: productId,
        })
            .first();
    }
    async create(data) {
        const [item] = await this.database("cart_items")
            .insert({
            cart_id: data.cart_id,
            product_id: data.product_id,
            quantity: data.quantity,
        })
            .returning("*");
        return item;
    }
    async updateQuantity(id, data) {
        const [item] = await this.database("cart_items")
            .where({ id })
            .update({
            quantity: data.quantity,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return item;
    }
    async delete(id) {
        return this.database("cart_items").where({ id }).del();
    }
    async deleteByCartId(cartId) {
        return this.database("cart_items")
            .where({ cart_id: cartId })
            .del();
    }
    async findByCartIdWithProductContext(cartId) {
        return this.database("cart_items")
            .join("products", "cart_items.product_id", "products.id")
            .join("stores", "products.store_id", "stores.id")
            .where("cart_items.cart_id", cartId)
            .select("cart_items.id", "cart_items.cart_id", "cart_items.product_id", "cart_items.quantity", "cart_items.created_at", "cart_items.updated_at", "products.name as product_name", "products.price as product_price", "products.availability as product_availability", "products.status as product_status", "products.store_id as product_store_id", "stores.status as store_status")
            .orderBy("cart_items.created_at", "asc");
    }
}
