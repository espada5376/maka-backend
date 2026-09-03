export async function up(knex) {
    await knex.schema.createTable("order_items", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table
            .uuid("order_id")
            .notNullable()
            .references("id")
            .inTable("orders")
            .onDelete("CASCADE");
        table
            .uuid("product_id")
            .notNullable()
            .references("id")
            .inTable("products")
            .onDelete("RESTRICT");
        table.string("product_name", 150).notNullable();
        table
            .decimal("unit_price", 12, 2)
            .notNullable();
        table.integer("quantity").notNullable();
        table
            .decimal("subtotal", 12, 2)
            .notNullable();
        table
            .timestamp("created_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.index(["order_id"], "order_items_order_id_idx");
        table.check("unit_price > 0", [], "order_items_unit_price_check");
        table.check("quantity > 0", [], "order_items_quantity_check");
        table.check("subtotal > 0", [], "order_items_subtotal_check");
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("order_items");
}
