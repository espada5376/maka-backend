import { Knex } from "knex";
import db from "../knex.js";

export interface Event {
  id: string;
  event_name: string;
  event_key: string | null;
  session_id: string | null;
  user_id: string | null;
  store_id: string | null;
  product_id: string | null;
  order_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: Date;
}

export interface CreateEventData {
  event_name: string;
  event_key?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  store_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at?: Date;
}

export class EventRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Event | undefined> {
    return this.database<Event>("events").where({ id }).first();
  }

  async findByEventKey(eventKey: string): Promise<Event | undefined> {
    return this.database<Event>("events")
      .where({ event_key: eventKey })
      .first();
  }

  async findBySessionId(sessionId: string): Promise<Event[]> {
    return this.database<Event>("events")
      .where({ session_id: sessionId })
      .orderBy("occurred_at", "desc");
  }

  async findByUserId(userId: string): Promise<Event[]> {
    return this.database<Event>("events")
      .where({ user_id: userId })
      .orderBy("occurred_at", "desc");
  }

  async findByStoreId(storeId: string): Promise<Event[]> {
    return this.database<Event>("events")
      .where({ store_id: storeId })
      .orderBy("occurred_at", "desc");
  }

  async findByProductId(productId: string): Promise<Event[]> {
    return this.database<Event>("events")
      .where({ product_id: productId })
      .orderBy("occurred_at", "desc");
  }

  async findByOrderId(orderId: string): Promise<Event[]> {
    return this.database<Event>("events")
      .where({ order_id: orderId })
      .orderBy("occurred_at", "desc");
  }

  async create(data: CreateEventData): Promise<Event> {
    const [event] = await this.database<Event>("events")
      .insert({
        event_name: data.event_name,
        event_key: data.event_key ?? null,
        session_id: data.session_id ?? null,
        user_id: data.user_id ?? null,
        store_id: data.store_id ?? null,
        product_id: data.product_id ?? null,
        order_id: data.order_id ?? null,
        metadata: data.metadata ?? {},
        ...(data.occurred_at
          ? {
              occurred_at: data.occurred_at,
            }
          : {}),
      })
      .returning("*");

    return event;
  }
}
