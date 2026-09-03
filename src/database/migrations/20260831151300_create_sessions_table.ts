import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("sessions", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("last_seen_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("expires_at", { useTz: true })
      .notNullable();

    table.index(["user_id"], "sessions_user_id_idx");
    table.index(["expires_at"], "sessions_expires_at_idx");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("sessions");
}
