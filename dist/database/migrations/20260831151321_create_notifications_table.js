export async function up(knex) {
    await knex.schema.createTable("notifications", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table
            .uuid("user_id")
            .notNullable()
            .references("id")
            .inTable("users")
            .onDelete("RESTRICT");
        table.string("type", 50).notNullable();
        table.string("title", 150).notNullable();
        table.text("body").notNullable();
        table
            .jsonb("data")
            .notNullable()
            .defaultTo("{}");
        table
            .timestamp("read_at", { useTz: true })
            .nullable();
        table
            .timestamp("created_at", { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());
        table.index(["user_id", "created_at"], "notifications_user_created_idx");
    });
    await knex.raw(`
    CREATE INDEX notifications_unread_idx
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL
  `);
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("notifications");
}
