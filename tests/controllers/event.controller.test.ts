
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EventController } from "../../src/controllers/event.controller.js";

describe("EventController", () => {
  const eventService = {
    record: vi.fn(),
  };

  const controller = new EventController(eventService as any);

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("record", () => {
    it("should record an event using the server session", async () => {
      const event = {
        id: "event-id",
        event_name: "product.viewed",
        session_id: "session-id",
        user_id: "user-id",
        store_id: "store-id",
        product_id: "product-id",
      };

      eventService.record.mockResolvedValue(event);

      const req = {
        session: {
          id: "session-id",
          user_id: "user-id",
        },
        body: {
          name: "product.viewed",
          storeId: "store-id",
          productId: "product-id",
          eventKey: "unique-event-key",
        },
      };

      await controller.record(req as any, res as any);

      expect(eventService.record).toHaveBeenCalledWith({
        name: "product.viewed",
        sessionId: "session-id",
        userId: "user-id",
        storeId: "store-id",
        productId: "product-id",
        eventKey: "unique-event-key",
        metadata: undefined,
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: event,
      });
    });

	
    it("should record a product.shared event with its metadata", async () => {
      const event = {
        id: "event-shared-id",
        event_name: "product.shared",
        session_id: "session-id",
        user_id: null,
        store_id: "store-id",
        product_id: "product-id",
      };

      eventService.record.mockResolvedValue(event);

      const req = {
        session: {
          id: "session-id",
          user_id: null,
        },
        body: {
          name: "product.shared",
          storeId: "store-id",
          productId: "product-id",
          eventKey: "share-event-key",
          metadata: {
            channel: "whatsapp",
          },
        },
      };

      await controller.record(req as any, res as any);

      expect(eventService.record).toHaveBeenCalledWith({
        name: "product.shared",
        sessionId: "session-id",
        userId: null,
        storeId: "store-id",
        productId: "product-id",
        eventKey: "share-event-key",
        metadata: {
          channel: "whatsapp",
        },
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: event,
      });
    });


    it("should propagate service errors", async () => {
      const error = new Error("Service error");
      eventService.record.mockRejectedValue(error);

      const req = {
        session: {
          id: "session-id",
          user_id: null,
        },
        body: {
          name: "category.viewed",
        },
      };

      await expect(
        controller.record(req as any, res as any),
      ).rejects.toBe(error);
    });
  });
});
