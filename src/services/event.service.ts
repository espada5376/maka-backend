import {
  BehavioralEventName,
  BehavioralEventPayload,
  EventDefinitionMap,
} from "../types/event.js";

import {
  Event,
  EventRepository,
} from "../database/repositories/event.repository.js";

import { AppError } from "../common/errors/app-error.js";
import { Errors } from "../common/errors/errors.js";

export interface EventService {
  record<T extends BehavioralEventName>(
    payload: BehavioralEventPayload<T>,
  ): Promise<Event>;

  getById(id: string): Promise<Event>;

  getBySessionId(sessionId: string): Promise<Event[]>;

  getByUserId(userId: string): Promise<Event[]>;

  getByStoreId(storeId: string): Promise<Event[]>;

  getByProductId(productId: string): Promise<Event[]>;

  getByOrderId(orderId: string): Promise<Event[]>;
}

export class EventServiceImpl implements EventService {
  constructor(
    private readonly eventRepository: EventRepository = new EventRepository(),
  ) {}

  // ===========================================================================
  // Record
  // ===========================================================================

  async record<T extends BehavioralEventName>(
    payload: BehavioralEventPayload<T>,
  ): Promise<Event> {
    this.validatePayload(payload);

    /*
     * eventKey provides idempotency.
     *
     * If the same key was already recorded, we return the existing event
     * instead of creating a duplicate.
     */
    if (payload.eventKey) {
      const existing = await this.eventRepository.findByEventKey(
        payload.eventKey,
      );

      if (existing) {
        if (existing.event_name !== payload.name) {
          throw new AppError(
            "EVENT_KEY_CONFLICT",
            "The event key is already associated with another event.",
            409,
          );
        }

        return existing;
      }
    }

    return this.eventRepository.create({
      event_name: payload.name,
      event_key: payload.eventKey ?? null,

      session_id: payload.sessionId ?? null,
      user_id: payload.userId ?? null,
      store_id: payload.storeId ?? null,
      product_id: payload.productId ?? null,
      order_id: payload.orderId ?? null,

      metadata: payload.metadata ?? {},
      occurred_at: payload.occurredAt,
    });
  }

  // ===========================================================================
  // Reads
  // ===========================================================================

  async getById(id: string): Promise<Event> {
    const event = await this.eventRepository.findById(id);

    if (!event) {
      throw new AppError(
        Errors.EVENT_NOT_FOUND.code,
        Errors.EVENT_NOT_FOUND.message,
        Errors.EVENT_NOT_FOUND.statusCode,
      );
    }

    return event;
  }

  async getBySessionId(sessionId: string): Promise<Event[]> {
    return this.eventRepository.findBySessionId(sessionId);
  }

  async getByUserId(userId: string): Promise<Event[]> {
    return this.eventRepository.findByUserId(userId);
  }

  async getByStoreId(storeId: string): Promise<Event[]> {
    return this.eventRepository.findByStoreId(storeId);
  }

  async getByProductId(productId: string): Promise<Event[]> {
    return this.eventRepository.findByProductId(productId);
  }

  async getByOrderId(orderId: string): Promise<Event[]> {
    return this.eventRepository.findByOrderId(orderId);
  }

  // ===========================================================================
  // Validation
  // ===========================================================================

  private validatePayload<T extends BehavioralEventName>(
    payload: BehavioralEventPayload<T>,
  ): void {
    if (!payload || typeof payload !== "object") {
      this.invalidEvent("Event payload is required.");
    }

    if (!payload.name) {
      this.invalidEvent("Event name is required.");
    }

    const definition = EventDefinitionMap[payload.name];

    if (!definition) {
      this.invalidEvent(`Unknown event: ${String(payload.name)}.`);
    }

    this.validateContext(payload, definition);

    this.validateMetadata(payload);
  }

  private validateContext<T extends BehavioralEventName>(
    payload: BehavioralEventPayload<T>,
    definition: {
      sessionId: "required" | "optional" | "forbidden";
      userId: "required" | "optional" | "forbidden";
      storeId: "required" | "optional" | "forbidden";
      productId: "required" | "optional" | "forbidden";
      orderId: "required" | "optional" | "forbidden";
    },
  ): void {
    this.validateContextField(
      "sessionId",
      payload.sessionId,
      definition.sessionId,
    );

    this.validateContextField("userId", payload.userId, definition.userId);

    this.validateContextField("storeId", payload.storeId, definition.storeId);

    this.validateContextField(
      "productId",
      payload.productId,
      definition.productId,
    );

    this.validateContextField("orderId", payload.orderId, definition.orderId);
  }

  private validateContextField(
    field: string,
    value: string | null | undefined,
    requirement: "required" | "optional" | "forbidden",
  ): void {
    const provided =
      value !== undefined && value !== null && value.trim().length > 0;

    if (requirement === "required" && !provided) {
      this.invalidEvent(`${field} is required for this event.`);
    }

    if (requirement === "forbidden" && provided) {
      this.invalidEvent(`${field} is not allowed for this event.`);
    }
  }

  private validateMetadata<T extends BehavioralEventName>(
    payload: BehavioralEventPayload<T>,
  ): void {
    const metadata = payload.metadata;

    switch (payload.name) {
      case "store.shared":
        this.validateStoreSharedMetadata(metadata);
        return;

      case "product.shared":
        this.validateProductSharedMetadata(metadata);
        return;

      case "search.performed":
        this.validateSearchPerformedMetadata(metadata);
        return;

      case "checkout.validation_failed":
        this.validateCheckoutValidationFailedMetadata(metadata);
        return;

      default:
        if (metadata !== undefined) {
          this.invalidEvent(
            `Metadata is not allowed for event "${payload.name}".`,
          );
        }
    }
  }

  private validateStoreSharedMetadata(metadata: unknown): void {
    if (!metadata || typeof metadata !== "object") {
      this.invalidEvent("Metadata is required for store.shared.");
    }

    const value = metadata as Record<string, unknown>;

    this.validateShareChannel(value.channel);
  }

  private validateProductSharedMetadata(metadata: unknown): void {
    if (!metadata || typeof metadata !== "object") {
      this.invalidEvent("Metadata is required for product.shared.");
    }

    const value = metadata as Record<string, unknown>;

    this.validateShareChannel(value.channel);
  }

  private validateShareChannel(channel: unknown): void {
    const validChannels = ["whatsapp", "tiktok", "copy_link", "other"];

    if (typeof channel !== "string" || !validChannels.includes(channel)) {
      this.invalidEvent("metadata.channel must be a valid share channel.");
    }
  }

  private validateSearchPerformedMetadata(metadata: unknown): void {
    if (!metadata || typeof metadata !== "object") {
      this.invalidEvent("Metadata is required for search.performed.");
    }

    const value = metadata as Record<string, unknown>;

    if (typeof value.query !== "string" || value.query.trim().length === 0) {
      this.invalidEvent("metadata.query must be a non-empty string.");
    }

    if (
      typeof value.results_count !== "number" ||
      !Number.isInteger(value.results_count) ||
      value.results_count < 0
    ) {
      this.invalidEvent(
        "metadata.results_count must be a non-negative integer.",
      );
    }
  }

  private validateCheckoutValidationFailedMetadata(metadata: unknown): void {
    if (!metadata || typeof metadata !== "object") {
      this.invalidEvent("Metadata is required for checkout.validation_failed.");
    }

    const value = metadata as Record<string, unknown>;

    const validFields = [
      "buyer_name",
      "phone",
      "delivery_city",
      "delivery_address",
    ];

    if (typeof value.field !== "string" || !validFields.includes(value.field)) {
      this.invalidEvent("metadata.field must be a valid checkout field.");
    }

    if (typeof value.reason !== "string" || value.reason.trim().length === 0) {
      this.invalidEvent("metadata.reason must be a non-empty string.");
    }
  }

  private invalidEvent(message: string): never {
    throw new AppError(
      Errors.INVALID_EVENT.code,
      message,
      Errors.INVALID_EVENT.statusCode,
    );
  }
}
