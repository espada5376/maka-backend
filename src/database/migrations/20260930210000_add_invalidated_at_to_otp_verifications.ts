import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("otp_verifications", (table) => {
    table
      .timestamp("invalidated_at", { useTz: true })
      .nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("otp_verifications", (table) => {
    table.dropColumn("invalidated_at");
  });
}
