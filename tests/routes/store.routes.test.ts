import express from "express";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createStoreRouter } from "../../src/routes/store.routes.js";
import type { StoreController } from "../../src/controllers/store.controller.js";

describe("StoreRouter", () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  async function startServer(
  controller: Partial<StoreController>,
): Promise<number> {
  const completeController = {
    create: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    getByOwnerId: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    getById: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    update: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    activate: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    deactivate: vi.fn((_req, res) => {
      res.status(200).json();
    }),
    ...controller,
  };

  const app = express();

  app.use(express.json());
  app.use(
    "/api/v1/stores",
    createStoreRouter(completeController as StoreController),
  );

  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine server port");
      }

      resolve(address.port);
    });
  });
}

  it("should route POST /api/v1/stores to create", async () => {
    const controller = {
      create: vi.fn((_req, res) => {
        res.status(201).json({
          success: true,
          data: { id: "store-1" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(`http://127.0.0.1:${port}/api/v1/stores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Ma Boutique",
      }),
    });

    expect(response.status).toBe(201);
    expect(controller.create).toHaveBeenCalledOnce();
  });

  it("should route GET /api/v1/stores/owner/:ownerId to getByOwnerId", async () => {
    const controller = {
      getByOwnerId: vi.fn((_req, res) => {
        res.status(200).json({
          success: true,
          data: { id: "store-1" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/owner/user-1`,
    );

    expect(response.status).toBe(200);
    expect(controller.getByOwnerId).toHaveBeenCalledOnce();
  });

  it("should route GET /api/v1/stores/:id to getById", async () => {
    const controller = {
      getById: vi.fn((_req, res) => {
        res.status(200).json({
          success: true,
          data: { id: "store-1" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/store-1`,
    );

    expect(response.status).toBe(200);
    expect(controller.getById).toHaveBeenCalledOnce();
  });

  it("should route PATCH /api/v1/stores/:id to update", async () => {
    const controller = {
      update: vi.fn((_req, res) => {
        res.status(200).json({
          success: true,
          data: { id: "store-1" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/store-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Nouvelle boutique",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(controller.update).toHaveBeenCalledOnce();
  });

  it("should route PATCH /api/v1/stores/:id/activate to activate", async () => {
    const controller = {
      activate: vi.fn((_req, res) => {
        res.status(200).json({
          success: true,
          data: { id: "store-1", status: "active" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/store-1/activate`,
      {
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(controller.activate).toHaveBeenCalledOnce();
  });

  it("should route PATCH /api/v1/stores/:id/deactivate to deactivate", async () => {
    const controller = {
      deactivate: vi.fn((_req, res) => {
        res.status(200).json({
          success: true,
          data: { id: "store-1", status: "inactive" },
        });
      }),
    };

    const port = await startServer(controller);

    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/stores/store-1/deactivate`,
      {
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(controller.deactivate).toHaveBeenCalledOnce();
  });
});
