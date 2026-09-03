import db from "../knex.js";
export class StoreRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("stores").where({ id }).first();
    }
    async findByOwnerId(ownerId) {
        return this.database("stores").where({ owner_id: ownerId }).first();
    }
    async create(data) {
        const [store] = await this.database("stores")
            .insert({
            owner_id: data.owner_id,
            name: data.name,
            description: data.description ?? null,
            country: data.country,
            city: data.city,
            currency: data.currency,
        })
            .returning("*");
        return store;
    }
    async update(id, data) {
        const [store] = await this.database("stores")
            .where({ id })
            .update({
            ...data,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return store;
    }
    async setStatus(id, status) {
        const [store] = await this.database("stores")
            .where({ id })
            .update({
            status,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return store;
    }
}
