export async function up(knex) {
    await knex.schema.createTable("users", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table.string("phone", 20).notNullable().unique();
        table
            .timestamp("phone_verified_at", { useTz: true })
            .nullable();
        table.string("name", 100).nullable();
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
        table.check("status IN ('active', 'inactive')", [], "users_status_check");
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("users");
}
