import { EventName, EventPayload } from "../types/event.js";

import { Event } from "../repositories/event.repository.js";

export interface EventService {
  /**
   * Record a behavioral event.
   *
   * Business events are created directly by business services
   * through EventRepository inside their transactions.
   */
  record<T extends EventName>(payload: EventPayload<T>): Promise<Event>;

  /**
   * Retrieve an event by its ID.
   */
  getById(id: string): Promise<Event>;

  /**
   * Retrieve all events associated with a session.
   */
  getBySessionId(sessionId: string): Promise<Event[]>;

  /**
   * Retrieve all events associated with a user.
   */
  getByUserId(userId: string): Promise<Event[]>;

  /**
   * Retrieve all events associated with a store.
   */
  getByStoreId(storeId: string): Promise<Event[]>;

  /**
   * Retrieve all events associated with a product.
   */
  getByProductId(productId: string): Promise<Event[]>;

  /**
   * Retrieve all events associated with an order.
   */
  getByOrderId(orderId: string): Promise<Event[]>;
}
