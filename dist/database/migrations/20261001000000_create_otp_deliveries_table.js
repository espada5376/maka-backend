export async function up(knex) {
    await knex.schema.createTable("otp_deliveries", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table
            .uuid("otp_verification_id")
            .notNullable()
            .references("id")
            .inTable("otp_verifications")
            .onDelete("CASCADE");
        table.string("recipient_phone", 20).notNullable();
        table.text("encrypted_code").notNullable();
        table
            .string("status", 20)
            .notNullable()
            .defaultTo("pending");
        table
            .integer("attempts")
            .notNullable()
            .defaultTo(0);
        table
            .string("provider_message_id", 255)
            .nullable();
        table
            .timestamp("sent_at", { useTz: true })
            .nullable();
        table
            .timestamp("failed_at", { useTz: true })
            .nullable();
        table
            .timestamp("processing_started_at", { useTz: true })
            .nullable();
        table
            .timestamp("next_attempt_at", { useTz: true })
            .nullable();
        table
            .string("error_code", 100)
            .nullable();
        table
            .text("error_message")
            .nullable();
        table
            .timestamp("created_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp("updated_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.unique(["otp_verification_id"], "otp_deliveries_otp_verification_unique");
        table.index(["status", "created_at"], "otp_deliveries_status_created_idx");
        table.index(["status", "processing_started_at"], "otp_deliveries_status_processing_idx");
        table.index(["status", "next_attempt_at", "created_at"], "otp_deliveries_queue_idx");
        table.index(["provider_message_id"], "otp_deliveries_provider_message_idx");
        table.check("status IN ('pending', 'sending', 'sent', 'failed')", [], "otp_deliveries_status_check");
        table.check("attempts >= 0", [], "otp_deliveries_attempts_check");
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("otp_deliveries");
}
