import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("events", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table.string("event_name", 50).notNullable();

    table
      .string("event_key", 150)
      .nullable()
      .unique();

    table
      .uuid("session_id")
      .nullable()
      .references("id")
      .inTable("sessions")
      .onDelete("SET NULL");

    table
      .uuid("user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .uuid("store_id")
      .nullable()
      .references("id")
      .inTable("stores")
      .onDelete("SET NULL");

    table
      .uuid("product_id")
      .nullable()
      .references("id")
      .inTable("products")
      .onDelete("SET NULL");

    table
      .uuid("order_id")
      .nullable()
      .references("id")
      .inTable("orders")
      .onDelete("SET NULL");

    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo("{}");

    table
      .timestamp("occurred_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(
      ["store_id", "occurred_at"],
      "events_store_occurred_idx",
    );

    table.index(
      ["session_id", "occurred_at"],
      "events_session_occurred_idx",
    );

    table.index(
      ["product_id", "occurred_at"],
      "events_product_occurred_idx",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("events");
}
