import db from "../knex.js";
export class NotificationRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("notifications").where({ id }).first();
    }
    async findByUserId(userId) {
        return this.database("notifications")
            .where({ user_id: userId })
            .orderBy("created_at", "desc");
    }
    async findUnreadByUserId(userId) {
        return this.database("notifications")
            .where({
            user_id: userId,
        })
            .whereNull("read_at")
            .orderBy("created_at", "desc");
    }
    async countUnreadByUserId(userId) {
        const result = await this.database("notifications")
            .where({
            user_id: userId,
        })
            .whereNull("read_at")
            .count("id as count")
            .first();
        return Number(result?.count ?? 0);
    }
    async create(data, database = this.database) {
        const [notification] = await database("notifications")
            .insert({
            user_id: data.user_id,
            type: data.type,
            title: data.title,
            body: data.body,
            data: data.data ?? {},
        })
            .returning("*");
        return notification;
    }
    async markAsRead(id) {
        const [notification] = await this.database("notifications")
            .where({ id })
            .whereNull("read_at")
            .update({
            read_at: this.database.fn.now(),
        })
            .returning("*");
        return notification;
    }
    async markAllAsRead(userId) {
        return this.database("notifications")
            .where({
            user_id: userId,
        })
            .whereNull("read_at")
            .update({
            read_at: this.database.fn.now(),
        });
    }
    async delete(id) {
        return this.database("notifications").where({ id }).del();
    }
}
