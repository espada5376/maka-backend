import db from "../knex.js";
export class CategoryRepository {
    database;
    constructor(database = db) {
        this.database = database;
    }
    async findById(id) {
        return this.database("categories").where({ id }).first();
    }
    async findBySlug(slug) {
        return this.database("categories").where({ slug }).first();
    }
    async findChildren(parentId) {
        return this.database("categories")
            .where({ parent_id: parentId })
            .orderBy("name", "asc");
    }
    async findRootCategories() {
        return this.database("categories")
            .whereNull("parent_id")
            .orderBy("name", "asc");
    }
    async create(data) {
        const [category] = await this.database("categories")
            .insert({
            parent_id: data.parent_id ?? null,
            name: data.name,
            slug: data.slug,
        })
            .returning("*");
        return category;
    }
    async update(id, data) {
        const [category] = await this.database("categories")
            .where({ id })
            .update({
            ...data,
            updated_at: this.database.fn.now(),
        })
            .returning("*");
        return category;
    }
}
