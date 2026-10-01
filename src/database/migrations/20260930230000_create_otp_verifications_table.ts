import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("otp_verifications", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("session_id")
      .notNullable()
      .references("id")
      .inTable("sessions")
      .onDelete("CASCADE");

    table.string("phone", 20).notNullable();

    table.string("code_hash", 255).notNullable();

    table
      .integer("attempts")
      .notNullable()
      .defaultTo(0);

    table
      .timestamp("expires_at", { useTz: true })
      .notNullable();

    table
      .timestamp("consumed_at", { useTz: true })
      .nullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(
      ["session_id"],
      "otp_verifications_session_id_idx",
    );

    table.index(
      ["phone"],
      "otp_verifications_phone_idx",
    );

    table.index(
      ["expires_at"],
      "otp_verifications_expires_at_idx",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("otp_verifications");
}
