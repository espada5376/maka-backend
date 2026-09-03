import { Knex } from "knex";
import db from "../knex.js";

export type CategoryStatus = "active" | "inactive";

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  status: CategoryStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryData {
  parent_id?: string | null;
  name: string;
  slug: string;
}

export interface UpdateCategoryData {
  parent_id?: string | null;
  name?: string;
  slug?: string;
  status?: CategoryStatus;
}

export class CategoryRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Category | undefined> {
    return this.database<Category>("categories").where({ id }).first();
  }

  async findBySlug(slug: string): Promise<Category | undefined> {
    return this.database<Category>("categories").where({ slug }).first();
  }

  async findChildren(parentId: string): Promise<Category[]> {
    return this.database<Category>("categories")
      .where({ parent_id: parentId })
      .orderBy("name", "asc");
  }

  async findRootCategories(): Promise<Category[]> {
    return this.database<Category>("categories")
      .whereNull("parent_id")
      .orderBy("name", "asc");
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const [category] = await this.database<Category>("categories")
      .insert({
        parent_id: data.parent_id ?? null,
        name: data.name,
        slug: data.slug,
      })
      .returning("*");

    return category;
  }

  async update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<Category | undefined> {
    const [category] = await this.database<Category>("categories")
      .where({ id })
      .update({
        ...data,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return category;
  }
}
