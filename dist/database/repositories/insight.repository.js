import db from "../knex.js";
export class InsightRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("insights")
            .where({ id })
            .first();
    }
    async findByStoreId(storeId) {
        return this.database("insights")
            .where({ store_id: storeId })
            .orderBy("created_at", "desc");
    }
    async findActiveByStoreId(storeId) {
        return this.database("insights")
            .where({
            store_id: storeId,
            status: "active",
        })
            .orderBy("created_at", "desc");
    }
    async create(data) {
        const [insight] = await this.database("insights")
            .insert({
            store_id: data.store_id,
            type: data.type,
            title: data.title,
            description: data.description,
            confidence: data.confidence.toFixed(4),
            data: data.data ?? {},
            status: data.status ?? "active",
        })
            .returning("*");
        return insight;
    }
    async update(id, data) {
        const updateData = {
            type: data.type,
            title: data.title,
            description: data.description,
            data: data.data,
            status: data.status,
        };
        if (data.confidence !== undefined) {
            updateData.confidence = data.confidence.toFixed(4);
        }
        const [insight] = await this.database("insights")
            .where({ id })
            .update(updateData)
            .returning("*");
        return insight;
    }
    async setStatus(id, status) {
        const [insight] = await this.database("insights")
            .where({ id })
            .update({ status })
            .returning("*");
        return insight;
    }
    async delete(id) {
        return this.database("insights")
            .where({ id })
            .del();
    }
}
