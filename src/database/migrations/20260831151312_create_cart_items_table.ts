import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("cart_items", (table) => {
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    table
      .uuid("cart_id")
      .notNullable()
      .references("id")
      .inTable("carts")
      .onDelete("CASCADE");

    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");

    table.integer("quantity").notNullable();

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(
      ["cart_id", "product_id"],
      "cart_items_cart_product_unique",
    );

    table.check(
      "quantity > 0",
      [],
      "cart_items_quantity_check",
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("cart_items");
}

