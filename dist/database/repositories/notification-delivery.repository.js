import db from "../knex.js";
export const MAX_NOTIFICATION_DELIVERY_ATTEMPTS = 3;
export class NotificationDeliveryRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("notification_deliveries")
            .where({ id })
            .first();
    }
    async findByNotificationId(notificationId) {
        return this.database("notification_deliveries")
            .where({
            notification_id: notificationId,
        })
            .first();
    }
    async create(data, database = this.database) {
        const [delivery] = await database("notification_deliveries")
            .insert({
            notification_id: data.notification_id,
            channel: data.channel ?? "whatsapp",
            status: "pending",
            attempts: 0,
            next_attempt_at: null,
        })
            .returning("*");
        return delivery;
    }
    async markSending(id) {
        const [delivery] = await this.database("notification_deliveries")
            .where({
            id,
            status: "pending",
        })
            .update({
            status: "sending",
            attempts: this.database.raw("attempts + 1"),
            processing_started_at: this.database.fn.now(),
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
    async markSent(id, data) {
        const [delivery] = await this.database("notification_deliveries")
            .where({ id })
            .update({
            status: "sent",
            provider_message_id: data.provider_message_id,
            sent_at: this.database.fn.now(),
            processing_started_at: null,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
    async markDelivered(id) {
        const [delivery] = await this.database("notification_deliveries")
            .where({ id })
            .update({
            status: "delivered",
            delivered_at: this.database.fn.now(),
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
    async markRead(id) {
        const [delivery] = await this.database("notification_deliveries")
            .where({ id })
            .update({
            status: "read",
            read_at: this.database.fn.now(),
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
    async markFailed(id, data = {}) {
        const [delivery] = await this.database("notification_deliveries")
            .where({
            id,
            status: "sending",
        })
            .update({
            status: "failed",
            failed_at: this.database.fn.now(),
            processing_started_at: null,
            next_attempt_at: null,
            error_code: data.error_code ?? null,
            error_message: data.error_message ?? null,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
    async requeueStaleSending(timeoutSeconds) {
        const result = await this.database("notification_deliveries")
            .where("status", "sending")
            .where("attempts", "<", MAX_NOTIFICATION_DELIVERY_ATTEMPTS)
            .where("processing_started_at", "<", this.database.raw(`now() - (? * interval '1 second')`, [timeoutSeconds]))
            .update({
            status: "pending",
            processing_started_at: null,
            updated_at: this.database.fn.now(),
        });
        return result;
    }
    async failExhaustedStaleSending(timeoutSeconds) {
        const result = await this.database("notification_deliveries")
            .where("status", "sending")
            .where("attempts", ">=", MAX_NOTIFICATION_DELIVERY_ATTEMPTS)
            .where("processing_started_at", "<", this.database.raw(`now() - (? * interval '1 second')`, [timeoutSeconds]))
            .update({
            status: "failed",
            failed_at: this.database.fn.now(),
            processing_started_at: null,
            next_attempt_at: null,
            error_code: "MAX_ATTEMPTS_EXCEEDED",
            error_message: "Maximum notification delivery attempts exceeded.",
            updated_at: this.database.fn.now(),
        });
        return result;
    }
    async claimPending() {
        return this.database.transaction(async (transaction) => {
            const delivery = await transaction("notification_deliveries")
                .where({
                status: "pending",
            })
                .where((query) => {
                query
                    .whereNull("next_attempt_at")
                    .orWhere("next_attempt_at", "<=", transaction.fn.now());
            })
                .orderBy("created_at", "asc")
                .forUpdate()
                .skipLocked()
                .first();
            if (!delivery) {
                return undefined;
            }
            const [claimedDelivery] = await transaction("notification_deliveries")
                .where({
                id: delivery.id,
                status: "pending",
            })
                .update({
                status: "sending",
                attempts: transaction.raw("attempts + 1"),
                processing_started_at: transaction.fn.now(),
                next_attempt_at: null,
                updated_at: transaction.fn.now(),
            })
                .returning("*");
            return claimedDelivery;
        });
    }
    async scheduleRetry(id, delaySeconds, data = {}) {
        const [delivery] = await this.database("notification_deliveries")
            .where({
            id,
            status: "sending",
        })
            .where("attempts", "<", MAX_NOTIFICATION_DELIVERY_ATTEMPTS)
            .update({
            status: "pending",
            processing_started_at: null,
            next_attempt_at: this.database.raw(`now() + (? * interval '1 second')`, [delaySeconds]),
            error_code: data.error_code ?? null,
            error_message: data.error_message ?? null,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return delivery;
    }
}
