import { Knex } from "knex";
import db from "../knex.js";

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
  created_at: Date;
}

export interface CreateProductImageData {
  product_id: string;
  url: string;
  position: number;
}

export interface UpdateProductImageData {
  url?: string;
  position?: number;
}

export class ProductImageRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<ProductImage | undefined> {
    return this.database<ProductImage>("product_images").where({ id }).first();
  }

  async findByProductId(productId: string): Promise<ProductImage[]> {
    return this.database<ProductImage>("product_images")
      .where({ product_id: productId })
      .orderBy("position", "asc");
  }

  async create(data: CreateProductImageData): Promise<ProductImage> {
    const [image] = await this.database<ProductImage>("product_images")
      .insert({
        product_id: data.product_id,
        url: data.url,
        position: data.position,
      })
      .returning("*");

    return image;
  }

  async update(
    id: string,
    data: UpdateProductImageData,
  ): Promise<ProductImage | undefined> {
    const [image] = await this.database<ProductImage>("product_images")
      .where({ id })
      .update(data)
      .returning("*");

    return image;
  }

  async delete(id: string): Promise<number> {
    return this.database<ProductImage>("product_images").where({ id }).del();
  }

  async deleteByProductId(productId: string): Promise<number> {
    return this.database<ProductImage>("product_images")
      .where({ product_id: productId })
      .del();
  }
}
