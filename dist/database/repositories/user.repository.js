import db from "../knex.js";
export class UserRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("users").where({ id }).first();
    }
    async findByPhone(phone, database = this.database) {
        return database("users").where({ phone }).first();
    }
    async create(data, database = this.database) {
        const [user] = await database("users")
            .insert({
            phone: data.phone,
            name: data.name ?? null,
        })
            .returning("*");
        return user;
    }
    async update(id, data) {
        const [user] = await this.database("users")
            .where({ id })
            .update({
            ...data,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return user;
    }
    async markPhoneAsVerified(id, database = this.database) {
        const [user] = await database("users")
            .where({ id })
            .update({
            phone_verified_at: database.fn.now(),
            updated_at: database.fn.now(),
        })
            .returning("*");
        return user;
    }
}
