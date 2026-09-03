export async function up(knex) {
    await knex.schema.createTable("orders", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table.string("reference", 20).notNullable().unique();
        table
            .string("idempotency_key", 100)
            .notNullable()
            .unique();
        table
            .uuid("store_id")
            .notNullable()
            .references("id")
            .inTable("stores")
            .onDelete("RESTRICT");
        table
            .uuid("buyer_user_id")
            .nullable()
            .references("id")
            .inTable("users")
            .onDelete("SET NULL");
        table
            .uuid("session_id")
            .notNullable()
            .references("id")
            .inTable("sessions")
            .onDelete("RESTRICT");
        table
            .string("status", 30)
            .notNullable()
            .defaultTo("pending");
        table
            .decimal("total_amount", 12, 2)
            .notNullable();
        table.string("currency", 3).notNullable();
        table.string("buyer_phone", 20).notNullable();
        table.string("delivery_country", 2).notNullable();
        table.string("delivery_city", 100).notNullable();
        table.text("delivery_address").notNullable();
        table
            .timestamp("created_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp("updated_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.index(["store_id", "status", "created_at"], "orders_store_status_created_idx");
        table.index(["buyer_user_id", "created_at"], "orders_buyer_created_idx");
        table.index(["session_id", "created_at"], "orders_session_created_idx");
        table.check(`
      status IN (
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'delivering',
        'delivered',
        'cancelled'
      )
      `, [], "orders_status_check");
        table.check("total_amount >= 0", [], "orders_total_amount_check");
        table.check("length(currency) = 3", [], "orders_currency_length_check");
        table.check("length(delivery_country) = 2", [], "orders_delivery_country_length_check");
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("orders");
}
