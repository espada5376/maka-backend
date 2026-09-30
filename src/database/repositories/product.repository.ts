
import { Knex } from "knex";

import db from "../knex.js";

export type ProductAvailability = "available" | "unavailable";

export type ProductStatus = "active" | "archived";

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  availability: ProductAvailability;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductData {
  store_id: string;
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
  availability?: ProductAvailability;
  status?: ProductStatus;
}

export interface UpdateProductData {
  store_id?: string;
  category_id?: string;
  name?: string;
  description?: string | null;
  price?: number;
  availability?: ProductAvailability;
  status?: ProductStatus;
}

export class ProductRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Product | undefined> {
    return this.database<Product>("products").where({ id }).first();
  }

  async findByStoreId(storeId: string): Promise<Product[]> {
    return this.database<Product>("products")
      .where({ store_id: storeId })
      .orderBy("created_at", "desc");
  }

  async findByCategoryId(categoryId: string): Promise<Product[]> {
    return this.database<Product>("products")
      .where({
        category_id: categoryId,
        status: "active",
      })
      .orderBy("created_at", "desc");
  }

  async findAvailableByStoreId(storeId: string): Promise<Product[]> {
    return this.database<Product>("products")
      .where({
        store_id: storeId,
        status: "active",
        availability: "available",
      })
      .orderBy("created_at", "desc");
  }

  async create(data: CreateProductData): Promise<Product> {
    const [product] = await this.database<Product>("products")
      .insert({
        store_id: data.store_id,
        category_id: data.category_id,
        name: data.name,
        description: data.description ?? null,
        price: data.price.toFixed(2),
        availability: data.availability ?? "available",
        status: data.status ?? "active",
      })
      .returning("*");

    return product;
  }

  async update(
    id: string,
    data: UpdateProductData,
  ): Promise<Product | undefined> {
    const updateData: Partial<{
      store_id: string;
      category_id: string;
      name: string;
      description: string | null;
      price: string;
      availability: ProductAvailability;
      status: ProductStatus;
      updated_at: Knex.Raw;
    }> = {
      store_id: data.store_id,
      category_id: data.category_id,
      name: data.name,
      description: data.description,
      availability: data.availability,
      status: data.status,
      updated_at: this.database.fn.now(),
    };

    if (data.price !== undefined) {
      updateData.price = data.price.toFixed(2);
    }

    const [product] = await this.database<Product>("products")
      .where({ id })
      .update(updateData)
      .returning("*");

    return product;
  }

  async setAvailability(
    id: string,
    availability: ProductAvailability,
  ): Promise<Product | undefined> {
    const [product] = await this.database<Product>("products")
      .where({ id })
      .update({
        availability,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return product;
  }

  async setStatus(
    id: string,
    status: ProductStatus,
  ): Promise<Product | undefined> {
    const [product] = await this.database<Product>("products")
      .where({ id })
      .update({
        status,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return product;
  }
}

