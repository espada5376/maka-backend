export async function up(knex) {
    await knex.schema.alterTable("notification_deliveries", (table) => {
        table
            .timestamp("next_attempt_at", { useTz: true })
            .nullable();
        table.index(["status", "next_attempt_at", "created_at"], "notification_deliveries_queue_idx");
    });
}
export async function down(knex) {
    await knex.schema.alterTable("notification_deliveries", (table) => {
        table.dropIndex(["status", "next_attempt_at", "created_at"], "notification_deliveries_queue_idx");
        table.dropColumn("next_attempt_at");
    });
}
