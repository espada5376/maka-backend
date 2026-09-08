import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventServiceImpl } from "../../src/services/event.service.js";

import {
  EventRepository,
  Event,
} from "../../src/database/repositories/event.repository.js";

describe("EventService", () => {
  let eventRepository: {
    findByEventKey: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;

    findById: ReturnType<typeof vi.fn>;
    findBySessionId: ReturnType<typeof vi.fn>;
    findByUserId: ReturnType<typeof vi.fn>;
    findByStoreId: ReturnType<typeof vi.fn>;
    findByProductId: ReturnType<typeof vi.fn>;
    findByOrderId: ReturnType<typeof vi.fn>;
  };

  let eventService: EventServiceImpl;

  const baseEvent: Event = {
    id: "event-1",
    event_name: "product.viewed",
    event_key: null,

    session_id: "session-1",
    user_id: null,
    store_id: "store-1",
    product_id: "product-1",
    order_id: null,

    metadata: {},

    occurred_at: new Date("2026-09-05T10:00:00.000Z"),
  };

  beforeEach(() => {
    eventRepository = {
      findByEventKey: vi.fn(),
      create: vi.fn(),

      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findByUserId: vi.fn(),
      findByStoreId: vi.fn(),
      findByProductId: vi.fn(),
      findByOrderId: vi.fn(),
    };

    eventService = new EventServiceImpl(
      eventRepository as unknown as EventRepository,
    );
  });

  // ===========================================================================
  // record()
  // ===========================================================================

  describe("record", () => {
    it("records a valid product.viewed event", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      const result = await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        userId: null,
        storeId: "store-1",
        productId: "product-1",
      });

      expect(result).toEqual(baseEvent);

      expect(eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.viewed",
        event_key: null,

        session_id: "session-1",
        user_id: null,
        store_id: "store-1",
        product_id: "product-1",
        order_id: null,

        metadata: {},
        occurred_at: undefined,
      });
    });

    it("requires a session", async () => {
      await expect(
        eventService.record({
          name: "product.viewed",
          storeId: "store-1",
          productId: "product-1",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
        statusCode: 400,
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("requires a store for store.viewed", async () => {
      await expect(
        eventService.record({
          name: "store.viewed",
          sessionId: "session-1",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("requires a product for product.viewed", async () => {
      await expect(
        eventService.record({
          name: "product.viewed",
          sessionId: "session-1",
          storeId: "store-1",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("rejects forbidden context fields", async () => {
      await expect(
        eventService.record({
          name: "product.viewed",
          sessionId: "session-1",
          storeId: "store-1",
          productId: "product-1",
          orderId: "order-1",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("allows an anonymous buyer", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        userId: null,
        storeId: "store-1",
        productId: "product-1",
      });

      expect(eventRepository.create).toHaveBeenCalled();
    });

    it("allows an authenticated user", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        userId: "user-1",
        storeId: "store-1",
        productId: "product-1",
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
        }),
      );
    });

    // -------------------------------------------------------------------------
    // store.shared
    // -------------------------------------------------------------------------

    it("accepts valid store.shared metadata", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue({
        ...baseEvent,
        event_name: "store.shared",
        metadata: {
          channel: "whatsapp",
        },
      });

      await eventService.record({
        name: "store.shared",
        sessionId: "session-1",
        storeId: "store-1",
        metadata: {
          channel: "whatsapp",
        },
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "store.shared",
          metadata: {
            channel: "whatsapp",
          },
        }),
      );
    });

    it("rejects store.shared without metadata", async () => {
      await expect(
        eventService.record({
          name: "store.shared",
          sessionId: "session-1",
          storeId: "store-1",
        } as never),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("rejects store.shared with an invalid channel", async () => {
      await expect(
        eventService.record({
          name: "store.shared",
          sessionId: "session-1",
          storeId: "store-1",
          metadata: {
            channel: "facebook",
          },
        } as never),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------------------------
    // product.shared
    // -------------------------------------------------------------------------

    it("accepts valid product.shared metadata", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "product.shared",
        sessionId: "session-1",
        storeId: "store-1",
        productId: "product-1",
        metadata: {
          channel: "tiktok",
        },
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            channel: "tiktok",
          },
        }),
      );
    });

    // -------------------------------------------------------------------------
    // search.performed
    // -------------------------------------------------------------------------

    it("accepts valid search.performed metadata", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "search.performed",
        sessionId: "session-1",
        metadata: {
          query: "robe noire",
          results_count: 12,
        },
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "search.performed",
          metadata: {
            query: "robe noire",
            results_count: 12,
          },
        }),
      );
    });

    it("rejects search.performed with an empty query", async () => {
      await expect(
        eventService.record({
          name: "search.performed",
          sessionId: "session-1",
          metadata: {
            query: "",
            results_count: 0,
          },
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });
    });

    it("rejects search.performed with a negative result count", async () => {
      await expect(
        eventService.record({
          name: "search.performed",
          sessionId: "session-1",
          metadata: {
            query: "robe",
            results_count: -1,
          },
        }),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });
    });

    // -------------------------------------------------------------------------
    // checkout.validation_failed
    // -------------------------------------------------------------------------

    it("accepts valid checkout.validation_failed metadata", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "checkout.validation_failed",
        sessionId: "session-1",
        storeId: "store-1",
        metadata: {
          field: "phone",
          reason: "invalid_format",
        },
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "checkout.validation_failed",
        }),
      );
    });

    it("rejects checkout.validation_failed with an invalid field", async () => {
      await expect(
        eventService.record({
          name: "checkout.validation_failed",
          sessionId: "session-1",
          storeId: "store-1",
          metadata: {
            field: "password",
            reason: "invalid",
          },
        } as never),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });
    });

    // -------------------------------------------------------------------------
    // Metadata forbidden
    // -------------------------------------------------------------------------

    it("rejects metadata for events that do not define metadata", async () => {
      await expect(
        eventService.record({
          name: "product.viewed",
          sessionId: "session-1",
          storeId: "store-1",
          productId: "product-1",
          metadata: {
            random: "value",
          },
        } as never),
      ).rejects.toMatchObject({
        code: "INVALID_EVENT",
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------------------------
    // eventKey
    // -------------------------------------------------------------------------

    it("creates an event with an event key", async () => {
      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        storeId: "store-1",
        productId: "product-1",
        eventKey: "event-key-1",
      });

      expect(eventRepository.findByEventKey).toHaveBeenCalledWith(
        "event-key-1",
      );

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_key: "event-key-1",
        }),
      );
    });

    it("returns the existing event for an already known event key", async () => {
      eventRepository.findByEventKey.mockResolvedValue(baseEvent);

      const result = await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        storeId: "store-1",
        productId: "product-1",
        eventKey: "event-key-1",
      });

      expect(result).toEqual(baseEvent);

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an event key already associated with another event type", async () => {
      eventRepository.findByEventKey.mockResolvedValue({
        ...baseEvent,
        event_name: "store.viewed",
      });

      await expect(
        eventService.record({
          name: "product.viewed",
          sessionId: "session-1",
          storeId: "store-1",
          productId: "product-1",
          eventKey: "event-key-1",
        }),
      ).rejects.toMatchObject({
        code: "EVENT_KEY_CONFLICT",
        statusCode: 409,
      });

      expect(eventRepository.create).not.toHaveBeenCalled();
    });

    // -------------------------------------------------------------------------
    // occurredAt
    // -------------------------------------------------------------------------

    it("preserves the provided occurredAt date", async () => {
      const occurredAt = new Date("2026-09-05T12:00:00.000Z");

      eventRepository.findByEventKey.mockResolvedValue(undefined);

      eventRepository.create.mockResolvedValue(baseEvent);

      await eventService.record({
        name: "product.viewed",
        sessionId: "session-1",
        storeId: "store-1",
        productId: "product-1",
        occurredAt,
      });

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          occurred_at: occurredAt,
        }),
      );
    });
  });

  // ===========================================================================
  // Reads
  // ===========================================================================

  describe("getById", () => {
    it("returns the event", async () => {
      eventRepository.findById.mockResolvedValue(baseEvent);

      const result = await eventService.getById("event-1");

      expect(result).toEqual(baseEvent);

      expect(eventRepository.findById).toHaveBeenCalledWith("event-1");
    });

    it("throws when the event does not exist", async () => {
      eventRepository.findById.mockResolvedValue(undefined);

      await expect(eventService.getById("unknown")).rejects.toMatchObject({
        code: "EVENT_NOT_FOUND",
        statusCode: 404,
      });
    });
  });

  describe("getBySessionId", () => {
    it("returns events for the session", async () => {
      eventRepository.findBySessionId.mockResolvedValue([baseEvent]);

      const result = await eventService.getBySessionId("session-1");

      expect(result).toEqual([baseEvent]);

      expect(eventRepository.findBySessionId).toHaveBeenCalledWith("session-1");
    });
  });

  describe("getByUserId", () => {
    it("returns events for the user", async () => {
      eventRepository.findByUserId.mockResolvedValue([baseEvent]);

      const result = await eventService.getByUserId("user-1");

      expect(result).toEqual([baseEvent]);

      expect(eventRepository.findByUserId).toHaveBeenCalledWith("user-1");
    });
  });

  describe("getByStoreId", () => {
    it("returns events for the store", async () => {
      eventRepository.findByStoreId.mockResolvedValue([baseEvent]);

      const result = await eventService.getByStoreId("store-1");

      expect(result).toEqual([baseEvent]);

      expect(eventRepository.findByStoreId).toHaveBeenCalledWith("store-1");
    });
  });

  describe("getByProductId", () => {
    it("returns events for the product", async () => {
      eventRepository.findByProductId.mockResolvedValue([baseEvent]);

      const result = await eventService.getByProductId("product-1");

      expect(result).toEqual([baseEvent]);

      expect(eventRepository.findByProductId).toHaveBeenCalledWith("product-1");
    });
  });

  describe("getByOrderId", () => {
    it("returns events for the order", async () => {
      eventRepository.findByOrderId.mockResolvedValue([baseEvent]);

      const result = await eventService.getByOrderId("order-1");

      expect(result).toEqual([baseEvent]);

      expect(eventRepository.findByOrderId).toHaveBeenCalledWith("order-1");
    });
  });
});
