export async function up(knex) {
    await knex.schema.createTable("products", (table) => {
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
        table
            .uuid("category_id")
            .notNullable()
            .references("id")
            .inTable("categories")
            .onDelete("RESTRICT");
        table.string("name", 150).notNullable();
        table.text("description").nullable();
        table
            .decimal("price", 12, 2)
            .notNullable();
        table
            .string("availability", 20)
            .notNullable()
            .defaultTo("available");
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
        table.index(["store_id"], "products_store_id_idx");
        table.index(["category_id"], "products_category_id_idx");
        table.check("price > 0", [], "products_price_check");
        table.check("availability IN ('available', 'unavailable')", [], "products_availability_check");
        table.check("status IN ('active', 'archived')", [], "products_status_check");
    });
    await knex.raw(`
    CREATE INDEX products_available_idx
    ON products (store_id, created_at DESC)
    WHERE status = 'active'
      AND availability = 'available'
  `);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("products");
}
