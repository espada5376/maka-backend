export async function up(knex) {
    await knex.schema.createTable("categories", (table) => {
        table
            .uuid("id")
            .primary()
            .defaultTo(knex.raw("gen_random_uuid()"));
        table
            .uuid("parent_id")
            .nullable()
            .references("id")
            .inTable("categories")
            .onDelete("RESTRICT");
        table.string("name", 100).notNullable();
        table.string("slug", 120).notNullable().unique();
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
        table.index(["parent_id"], "categories_parent_id_idx");
        table.check("status IN ('active', 'inactive')", [], "categories_status_check");
        table.check("parent_id IS NULL OR parent_id != id", [], "categories_parent_check");
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists("categories");
}
