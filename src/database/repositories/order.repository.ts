
import { Knex } from "knex";

import db from "../knex.js";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  reference: string;
  idempotency_key: string;
  store_id: string;
  buyer_user_id: string | null;
  session_id: string;
  status: OrderStatus;
  total_amount: string;
  currency: string;
  buyer_phone: string;
  delivery_country: string;
  delivery_city: string;
  delivery_address: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderData {
  reference: string;
  idempotency_key: string;
  store_id: string;
  buyer_user_id?: string | null;
  session_id: string;
  status?: OrderStatus;
  total_amount: number;
  currency: string;
  buyer_phone: string;
  delivery_country: string;
  delivery_city: string;
  delivery_address: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  created_at: Date;
}

export interface CreateOrderItemData {
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export class OrderRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Order | undefined> {
    return this.database<Order>("orders").where({ id }).first();
  }

  async findByReference(reference: string): Promise<Order | undefined> {
    return this.database<Order>("orders").where({ reference }).first();
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Order | undefined> {
    return this.database<Order>("orders")
      .where({
        idempotency_key: idempotencyKey,
      })
      .first();
  }

  async findBySessionId(sessionId: string): Promise<Order[]> {
    return this.database<Order>("orders")
      .where({
        session_id: sessionId,
      })
      .orderBy("created_at", "desc");
  }

  async findByBuyerUserId(buyerUserId: string): Promise<Order[]> {
    return this.database<Order>("orders")
      .where({
        buyer_user_id: buyerUserId,
      })
      .orderBy("created_at", "desc");
  }

  async findByStoreId(storeId: string): Promise<Order[]> {
    return this.database<Order>("orders")
      .where({
        store_id: storeId,
      })
      .orderBy("created_at", "desc");
  }

  async create(data: CreateOrderData): Promise<Order> {
    const [order] = await this.database<Order>("orders")
      .insert({
        reference: data.reference,
        idempotency_key: data.idempotency_key,
        store_id: data.store_id,
        buyer_user_id: data.buyer_user_id ?? null,
        session_id: data.session_id,
        status: data.status ?? "pending",
        total_amount: data.total_amount.toFixed(2),
        currency: data.currency,
        buyer_phone: data.buyer_phone,
        delivery_country: data.delivery_country,
        delivery_city: data.delivery_city,
        delivery_address: data.delivery_address,
      })
      .returning("*");

    return order;
  }

  
  async updateStatus(
    id: string,
    status: OrderStatus,
    expectedStatus: OrderStatus,
  ): Promise<Order | undefined> {
    const [order] = await this.database<Order>("orders")
      .where({
        id,
        status: expectedStatus,
      })
      .update({
        status,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return order;
  }


  async findItems(orderId: string): Promise<OrderItem[]> {
    return this.database<OrderItem>("order_items")
      .where({
        order_id: orderId,
      })
      .orderBy("created_at", "asc");
  }

  async findItemsByProductId(productId: string): Promise<OrderItem[]> {
    return this.database<OrderItem>("order_items")
      .where({
        product_id: productId,
      })
      .orderBy("created_at", "desc");
  }

  async findItemsByStoreId(storeId: string): Promise<OrderItem[]> {
    return this.database<OrderItem>("order_items")
      .join(
        "orders",
        "order_items.order_id",
        "orders.id",
      )
      .where(
        "orders.store_id",
        storeId,
      )
      .select("order_items.*")
      .orderBy(
        "order_items.created_at",
        "desc",
      );
  }

  async createItem(data: CreateOrderItemData): Promise<OrderItem> {
    const [item] = await this.database<OrderItem>("order_items")
      .insert({
        order_id: data.order_id,
        product_id: data.product_id,
        product_name: data.product_name,
        unit_price: data.unit_price.toFixed(2),
        quantity: data.quantity,
        subtotal: data.subtotal.toFixed(2),
      })
      .returning("*");

    return item;
  }

  async createItems(items: CreateOrderItemData[]): Promise<OrderItem[]> {
    if (items.length === 0) {
      return [];
    }

    const dbItems = items.map((item) => ({
      order_id: item.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price.toFixed(2),
      quantity: item.quantity,
      subtotal: item.subtotal.toFixed(2),
    }));

    return this.database<OrderItem>("order_items")
      .insert(dbItems)
      .returning("*");
  }
}
