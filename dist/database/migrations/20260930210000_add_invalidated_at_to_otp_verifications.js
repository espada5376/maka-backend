export async function up(knex) {
    await knex.schema.alterTable("otp_verifications", (table) => {
        table
            .timestamp("invalidated_at", { useTz: true })
            .nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable("otp_verifications", (table) => {
        table.dropColumn("invalidated_at");
    });
}
