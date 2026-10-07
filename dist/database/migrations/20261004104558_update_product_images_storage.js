export async function up(knex) {
    await knex.schema.alterTable("product_images", (table) => {
        table.dropColumn("url");
        table.text("storage_key").notNullable();
    });
    await knex.schema.alterTable("product_images", (table) => {
        table.unique(["product_id", "position"], "product_images_product_position_unique");
    });
}
export async function down(knex) {
    await knex.schema.alterTable("product_images", (table) => {
        table.dropUnique(["product_id", "position"], "product_images_product_position_unique");
    });
    await knex.schema.alterTable("product_images", (table) => {
        table.dropColumn("storage_key");
        table.text("url").notNullable();
    });
}
