import db from "../knex.js";
export class CartRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("carts").where({ id }).first();
    }
    async findBySessionId(sessionId) {
        return this.database("carts")
            .where({ session_id: sessionId })
            .first();
    }
    async create(data) {
        const [cart] = await this.database("carts")
            .insert({
            session_id: data.session_id,
        })
            .returning("*");
        return cart;
    }
    async findOrCreateBySessionId(sessionId) {
        const existing = await this.findBySessionId(sessionId);
        if (existing) {
            return existing;
        }
        try {
            return await this.create({
                session_id: sessionId,
            });
        }
        catch (error) {
            const existingAfterConflict = await this.findBySessionId(sessionId);
            if (existingAfterConflict) {
                return existingAfterConflict;
            }
            throw error;
        }
    }
}
