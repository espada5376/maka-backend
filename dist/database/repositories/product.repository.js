import db from "../knex.js";
export class ProductRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("products").where({ id }).first();
    }
    async findAvailableById(id) {
        return this.database("products")
            .where({
            id,
            status: "active",
            availability: "available",
        })
            .first();
    }
    async findByStoreId(storeId) {
        return this.database("products")
            .where({ store_id: storeId })
            .orderBy("created_at", "desc");
    }
    async findByCategoryId(categoryId) {
        return this.database("products")
            .where({
            category_id: categoryId,
            status: "active",
            availability: "available",
        })
            .orderBy("created_at", "desc");
    }
    async findAvailableByStoreId(storeId) {
        return this.database("products")
            .where({
            store_id: storeId,
            status: "active",
            availability: "available",
        })
            .orderBy("created_at", "desc");
    }
    async create(data) {
        const [product] = await this.database("products")
            .insert({
            store_id: data.store_id,
            category_id: data.category_id,
            name: data.name,
            description: data.description ?? null,
            price: data.price.toFixed(2),
            availability: data.availability ?? "available",
            status: data.status ?? "active",
        })
            .returning("*");
        return product;
    }
    async update(id, data) {
        const updateData = {
            store_id: data.store_id,
            category_id: data.category_id,
            name: data.name,
            description: data.description,
            availability: data.availability,
            status: data.status,
            updated_at: this.database.fn.now(),
        };
        if (data.price !== undefined) {
            updateData.price = data.price.toFixed(2);
        }
        const [product] = await this.database("products")
            .where({ id })
            .update(updateData)
            .returning("*");
        return product;
    }
    async setAvailability(id, availability) {
        const [product] = await this.database("products")
            .where({ id })
            .update({
            availability,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return product;
    }
    async setStatus(id, status) {
        const [product] = await this.database("products")
            .where({ id })
            .update({
            status,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return product;
    }
}
