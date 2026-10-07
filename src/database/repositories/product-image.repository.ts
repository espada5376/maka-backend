import { Knex } from "knex";
import db from "../knex.js";

export interface ProductImage {
  id: string;
  product_id: string;
  storage_key: string;
  position: number;
  created_at: Date;
}

export interface CreateProductImageData {
  id: string;
  product_id: string;
  storage_key: string;
  position: number;
}

export interface UpdateProductImageData {
  storage_key?: string;
  position?: number;
}

export interface UpdateProductImagePositionData {
  id: string;
  position: number;
}

export class ProductImageRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<ProductImage | undefined> {
    return this.database<ProductImage>("product_images")
      .where({ id })
      .first();
  }

  async findByProductId(productId: string): Promise<ProductImage[]> {
    return this.database<ProductImage>("product_images")
      .where({ product_id: productId })
      .orderBy("position", "asc");
  }

  async create(data: CreateProductImageData): Promise<ProductImage> {
    const [image] = await this.database<ProductImage>("product_images")
      .insert({
        id: data.id,
        product_id: data.product_id,
        storage_key: data.storage_key,
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

  async updatePositions(
  updates: UpdateProductImagePositionData[],
): Promise<ProductImage[]> {
  const results: ProductImage[] = [];

  for (const update of updates) {
    const [image] = await this.database<ProductImage>(
      "product_images",
    )
      .where({ id: update.id })
      .update({
        position: update.position,
      })
      .returning("*");

    if (image) {
      results.push(image);
    }
  }

  return results;
}

async reorderPositions(
  productId: string,
  updates: UpdateProductImagePositionData[],
): Promise<ProductImage[]> {
  if (updates.length === 0) {
    return [];
  }

  return this.database.transaction(async (trx) => {
    const maxPositionResult = await trx<ProductImage>(
      "product_images",
    )
      .where({
        product_id: productId,
      })
      .max<{ max: number | string | null }>(
        "position as max",
      )
      .first();

    const maxPosition = Number(
      maxPositionResult?.max ?? -1,
    );

    const temporaryOffset =
      maxPosition + updates.length + 1;

    /*
     * Phase 1:
     * Move the affected images to temporary positions
     * to avoid UNIQUE(product_id, position) conflicts.
     */
    for (
      let index = 0;
      index < updates.length;
      index++
    ) {
      const update = updates[index];

      await trx<ProductImage>("product_images")
        .where({
          id: update.id,
          product_id: productId,
        })
        .update({
          position: temporaryOffset + index,
        });
    }

    /*
     * Phase 2:
     * Apply the final positions.
     */
    for (const update of updates) {
      await trx<ProductImage>("product_images")
        .where({
          id: update.id,
          product_id: productId,
        })
        .update({
          position: update.position,
        });
    }

    const imageIds = updates.map(
      (update) => update.id,
    );

    return trx<ProductImage>("product_images")
      .where({
        product_id: productId,
      })
      .whereIn("id", imageIds)
      .orderBy("position", "asc");
  });
}

  async delete(id: string): Promise<number> {
    return this.database<ProductImage>("product_images")
      .where({ id })
      .del();
  }

  async deleteByProductId(productId: string): Promise<number> {
    return this.database<ProductImage>("product_images")
      .where({ product_id: productId })
      .del();
  }
}
