import db from "../knex.js";
export class ProductImageRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("product_images")
            .where({ id })
            .first();
    }
    async findByProductId(productId) {
        return this.database("product_images")
            .where({ product_id: productId })
            .orderBy("position", "asc");
    }
    async create(data) {
        const [image] = await this.database("product_images")
            .insert({
            id: data.id,
            product_id: data.product_id,
            storage_key: data.storage_key,
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
    async updatePositions(updates) {
        const results = [];
        for (const update of updates) {
            const [image] = await this.database("product_images")
                .where({ id: update.id })
                .update({
                position: update.position,
            })
                .returning("*");
            if (image) {
                results.push(image);
            }
        }
        return results;
    }
    async reorderPositions(productId, updates) {
        if (updates.length === 0) {
            return [];
        }
        return this.database.transaction(async (trx) => {
            const maxPositionResult = await trx("product_images")
                .where({
                product_id: productId,
            })
                .max("position as max")
                .first();
            const maxPosition = Number(maxPositionResult?.max ?? -1);
            const temporaryOffset = maxPosition + updates.length + 1;
            /*
             * Phase 1:
             * Move the affected images to temporary positions
             * to avoid UNIQUE(product_id, position) conflicts.
             */
            for (let index = 0; index < updates.length; index++) {
                const update = updates[index];
                await trx("product_images")
                    .where({
                    id: update.id,
                    product_id: productId,
                })
                    .update({
                    position: temporaryOffset + index,
                });
            }
            /*
             * Phase 2:
             * Apply the final positions.
             */
            for (const update of updates) {
                await trx("product_images")
                    .where({
                    id: update.id,
                    product_id: productId,
                })
                    .update({
                    position: update.position,
                });
            }
            const imageIds = updates.map((update) => update.id);
            return trx("product_images")
                .where({
                product_id: productId,
            })
                .whereIn("id", imageIds)
                .orderBy("position", "asc");
        });
    }
    async delete(id) {
        return this.database("product_images")
            .where({ id })
            .del();
    }
    async deleteByProductId(productId) {
        return this.database("product_images")
            .where({ product_id: productId })
            .del();
    }
}
