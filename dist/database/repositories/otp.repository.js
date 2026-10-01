import db from "../knex.js";
export class OtpRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("otp_verifications")
            .where({ id })
            .first();
    }
    async findLatestActive(sessionId, phone) {
        return this.database("otp_verifications")
            .where({
            session_id: sessionId,
            phone,
        })
            .whereNull("consumed_at")
            .whereNull("invalidated_at")
            .where("expires_at", ">", this.database.fn.now())
            .orderBy("created_at", "desc")
            .first();
    }
    async create(data, database = this.database) {
        const [otp] = await database("otp_verifications")
            .insert({
            session_id: data.session_id,
            phone: data.phone,
            code_hash: data.code_hash,
            expires_at: data.expires_at,
        })
            .returning("*");
        return otp;
    }
    async invalidateActive(sessionId, phone, database = this.database) {
        return database("otp_verifications")
            .where({
            session_id: sessionId,
            phone,
        })
            .whereNull("consumed_at")
            .whereNull("invalidated_at")
            .update({
            invalidated_at: database.fn.now(),
        });
    }
    async incrementAttempts(id, database = this.database) {
        const [otp] = await database("otp_verifications")
            .where({ id })
            .increment("attempts", 1)
            .returning("*");
        return otp;
    }
    async consume(id, database = this.database) {
        const [otp] = await database("otp_verifications")
            .where({ id })
            .whereNull("consumed_at")
            .whereNull("invalidated_at")
            .update({
            consumed_at: database.fn.now(),
        })
            .returning("*");
        return otp;
    }
    async findLatestPending(sessionId, phone) {
        return this.database("otp_verifications")
            .where({
            session_id: sessionId,
            phone,
        })
            .whereNull("consumed_at")
            .whereNull("invalidated_at")
            .orderBy("created_at", "desc")
            .first();
    }
    async findLatestPendingForUpdate(sessionId, phone, database = this.database) {
        return database("otp_verifications")
            .where({
            session_id: sessionId,
            phone,
        })
            .whereNull("consumed_at")
            .whereNull("invalidated_at")
            .orderBy("created_at", "desc")
            .forUpdate()
            .first();
    }
}
