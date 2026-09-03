import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("stores", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("owner_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");

    table.string("name", 100).notNullable();

    table.text("description").nullable();

    table.string("country", 2).notNullable();

    table.string("city", 100).notNullable();

    table.string("currency", 3).notNullable();

    table
      .string("status", 20)
      .notNullable()
      .defaultTo("active");

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["owner_id"], "stores_owner_id_unique");

    table.check(
      "status IN ('active', 'inactive')",
      [],
      "stores_status_check",
    );

    table.check(
      "length(country) = 2",
      [],
      "stores_country_length_check",
    );

    table.check(
      "length(currency) = 3",
      [],
      "stores_currency_length_check",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("stores");
}
