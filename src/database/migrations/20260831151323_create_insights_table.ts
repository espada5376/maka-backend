import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("insights", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("store_id")
      .notNullable()
      .references("id")
      .inTable("stores")
      .onDelete("RESTRICT");

    table.string("type", 50).notNullable();

    table.string("title", 150).notNullable();

    table.text("description").notNullable();

    table
      .decimal("confidence", 5, 4)
      .notNullable();

    table
      .jsonb("data")
      .notNullable()
      .defaultTo("{}");

    table
      .string("status", 20)
      .notNullable()
      .defaultTo("active");

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(
      ["store_id", "status", "created_at"],
      "insights_store_status_created_idx",
    );

    table.check(
      "confidence >= 0 AND confidence <= 1",
      [],
      "insights_confidence_check",
    );

    table.check(
      "status IN ('active', 'read', 'archived')",
      [],
      "insights_status_check",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("insights");
}
