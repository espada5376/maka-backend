import { Knex } from "knex";
import db from "../knex.js";

export interface Cart {
  id: string;
  session_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCartData {
  session_id: string;
}

export class CartRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Cart | undefined> {
    return this.database<Cart>("carts").where({ id }).first();
  }

  async findBySessionId(sessionId: string): Promise<Cart | undefined> {
    return this.database<Cart>("carts")
      .where({ session_id: sessionId })
      .first();
  }

  async create(data: CreateCartData): Promise<Cart> {
    const [cart] = await this.database<Cart>("carts")
      .insert({
        session_id: data.session_id,
      })
      .returning("*");

    return cart;
  }

  async findOrCreateBySessionId(sessionId: string): Promise<Cart> {
    const existing = await this.findBySessionId(sessionId);

    if (existing) {
      return existing;
    }

    try {
      return await this.create({
        session_id: sessionId,
      });
    } catch (error) {
      const existingAfterConflict = await this.findBySessionId(sessionId);

      if (existingAfterConflict) {
        return existingAfterConflict;
      }

      throw error;
    }
  }
}
