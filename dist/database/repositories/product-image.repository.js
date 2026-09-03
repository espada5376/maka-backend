import db from "../knex.js";
export class ProductImageRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("product_images").where({ id }).first();
    }
    async findByProductId(productId) {
        return this.database("product_images")
            .where({ product_id: productId })
            .orderBy("position", "asc");
    }
    async create(data) {
        const [image] = await this.database("product_images")
            .insert({
            product_id: data.product_id,
            url: data.url,
            position: data.position,
        })
            .returning("*");
        return image;
    }
    async update(id, data) {
        const [image] = await this.database("product_images")
            .where({ id })
            .update(data)
            .returning("*");
        return image;
    }
    async delete(id) {
        return this.database("product_images").where({ id }).del();
    }
    async deleteByProductId(productId) {
        return this.database("product_images")
            .where({ product_id: productId })
            .del();
    }
}
