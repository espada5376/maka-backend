import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

import { StoreController } from "../../src/controllers/store.controller.js";
import type { Store } from "../../src/database/repositories/store.repository.js";
import type {
  CreateStoreInput,
  UpdateStoreInput,
} from "../../src/services/store.service.js";

function createMockResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockNext() {
  return vi.fn() as unknown as NextFunction;
}

function createStore(): Store {
  return {
    id: "store-1",
    owner_id: "user-1",
    name: "Ma Boutique",
    description: "Boutique de vêtements",
    country: "TG",
    city: "Lomé",
    currency: "XOF",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("StoreController", () => {
  describe("create", () => {
    it("should create a store and return 201", async () => {
      const store = createStore();

      const storeService = {
        create: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        body: {
          name: "Ma Boutique",
          description: "Boutique de vêtements",
          country: "TG",
          city: "Lomé",
        } satisfies CreateStoreInput,
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.create(req, res, next);

      expect(storeService.create).toHaveBeenCalledWith("session-1", req.body);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store creation failed");

      const storeService = {
        create: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        body: {},
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.create(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("should return a store and 200", async () => {
      const store = createStore();

      const storeService = {
        getById: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.getById(req, res, next);

      expect(storeService.getById).toHaveBeenCalledWith("store-1");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store not found");

      const storeService = {
        getById: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.getById(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("getByOwnerId", () => {
    it("should return the owner's store and 200", async () => {
      const store = createStore();

      const storeService = {
        getByOwnerId: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        params: {
          ownerId: "user-1",
        },
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.getByOwnerId(req, res, next);

      expect(storeService.getByOwnerId).toHaveBeenCalledWith("user-1");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store lookup failed");

      const storeService = {
        getByOwnerId: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        params: {
          ownerId: "user-1",
        },
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.getByOwnerId(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a store and return 200", async () => {
      const store = createStore();

      const storeService = {
        update: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
        body: {
          name: "Nouvelle Boutique",
          city: "Lomé",
        } satisfies UpdateStoreInput,
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.update(req, res, next);

      expect(storeService.update).toHaveBeenCalledWith(
        "session-1",
        "store-1",
        req.body,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store update failed");

      const storeService = {
        update: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
        body: {},
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.update(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("activate", () => {
    it("should activate a store and return 200", async () => {
      const store = createStore();

      const storeService = {
        activate: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.activate(req, res, next);

      expect(storeService.activate).toHaveBeenCalledWith(
        "session-1",
        "store-1",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store activation failed");

      const storeService = {
        activate: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.activate(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("should deactivate a store and return 200", async () => {
      const store = {
        ...createStore(),
        status: "inactive" as const,
      };

      const storeService = {
        deactivate: vi.fn().mockResolvedValue(store),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();
      const next = createMockNext();

      await controller.deactivate(req, res, next);

      expect(storeService.deactivate).toHaveBeenCalledWith(
        "session-1",
        "store-1",
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: store,
      });

      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate service errors", async () => {
      const error = new Error("Store deactivation failed");

      const storeService = {
        deactivate: vi.fn().mockRejectedValue(error),
      };

      const controller = new StoreController(storeService as never);

      const req = {
        session: {
          id: "session-1",
        },
        params: {
          id: "store-1",
        },
      } as unknown as Request;

      const res = createMockResponse();

await expect(
  controller.deactivate(req, res),
).rejects.toBe(error);

expect(res.status).not.toHaveBeenCalled();
expect(res.json).not.toHaveBeenCalled();
    });
  });
});
