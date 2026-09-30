export async function up(knex) {
    await knex.schema.alterTable("notification_deliveries", (table) => {
        table
            .timestamp("processing_started_at", { useTz: true })
            .nullable();
        table.index(["status", "processing_started_at"], "notification_deliveries_status_processing_idx");
    });
}
export async function down(knex) {
    await knex.schema.alterTable("notification_deliveries", (table) => {
        table.dropIndex(["status", "processing_started_at"], "notification_deliveries_status_processing_idx");
        table.dropColumn("processing_started_at");
    });
}
