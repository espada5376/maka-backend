import { Knex } from "knex";
import db from "../knex.js";

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface CartItemWithProductContext extends CartItem {
  product_name: string;
  product_price: string;
  product_availability: "available" | "unavailable";
  product_status: "active" | "archived";
  product_store_id: string;
  store_status: "active" | "inactive";
}

export interface CreateCartItemData {
  cart_id: string;
  product_id: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

export class CartItemRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<CartItem | undefined> {
    return this.database<CartItem>("cart_items").where({ id }).first();
  }

  async findByCartId(cartId: string): Promise<CartItem[]> {
    return this.database<CartItem>("cart_items")
      .where({ cart_id: cartId })
      .orderBy("created_at", "asc");
  }

  async findByCartAndProduct(
    cartId: string,
    productId: string,
  ): Promise<CartItem | undefined> {
    return this.database<CartItem>("cart_items")
      .where({
        cart_id: cartId,
        product_id: productId,
      })
      .first();
  }

  async create(data: CreateCartItemData): Promise<CartItem> {
    const [item] = await this.database<CartItem>("cart_items")
      .insert({
        cart_id: data.cart_id,
        product_id: data.product_id,
        quantity: data.quantity,
      })
      .returning("*");

    return item;
  }

  async updateQuantity(
    id: string,
    data: UpdateCartItemData,
  ): Promise<CartItem | undefined> {
    const [item] = await this.database<CartItem>("cart_items")
      .where({ id })
      .update({
        quantity: data.quantity,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return item;
  }

  async delete(id: string): Promise<number> {
    return this.database<CartItem>("cart_items").where({ id }).del();
  }

  async deleteByCartId(cartId: string): Promise<number> {
    return this.database<CartItem>("cart_items")
      .where({ cart_id: cartId })
      .del();
  }

  async findByCartIdWithProductContext(
    cartId: string,
  ): Promise<CartItemWithProductContext[]> {
    return this.database("cart_items")
      .join("products", "cart_items.product_id", "products.id")
      .join("stores", "products.store_id", "stores.id")
      .where("cart_items.cart_id", cartId)
      .select(
        "cart_items.id",
        "cart_items.cart_id",
        "cart_items.product_id",
        "cart_items.quantity",
        "cart_items.created_at",
        "cart_items.updated_at",

        "products.name as product_name",
        "products.price as product_price",
        "products.availability as product_availability",
        "products.status as product_status",
        "products.store_id as product_store_id",

        "stores.status as store_status",
      )
      .orderBy("cart_items.created_at", "asc");
  }
}
