import db from "../knex.js";
export class SessionRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("sessions").where({ id }).first();
    }
    async findByUserId(userId) {
        return this.database("sessions")
            .where({ user_id: userId })
            .orderBy("created_at", "desc");
    }
    async create(data) {
        const [session] = await this.database("sessions")
            .insert({
            user_id: data.user_id ?? null,
            expires_at: data.expires_at,
        })
            .returning("*");
        return session;
    }
    async update(id, data) {
        const [session] = await this.database("sessions")
            .where({ id })
            .update(data)
            .returning("*");
        return session;
    }
    async delete(id) {
        return this.database("sessions").where({ id }).del();
    }
}
