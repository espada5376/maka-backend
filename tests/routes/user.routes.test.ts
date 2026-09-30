import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";	

import express from "express";
import type { Server } from "node:http";

import { createUserRouter } from "../../src/routes/user.routes.js";

describe("User routes", () => {
  const userController = {
    getById: vi.fn(
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: "user-1",
          },
        });
      },
    ),

    create: vi.fn(
      (_req, res) => {
        res.status(201).json({
          success: true,
          data: {
            id: "user-1",
          },
        });
      },
    ),

    update: vi.fn(
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: "user-1",
          },
        });
      },
    ),

    markPhoneAsVerified: vi.fn(
      (_req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: "user-1",
          },
        });
      },
    ),
  };

  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = express();

    app.use(express.json());

    app.use(
      "/api/v1/users",
      createUserRouter(
        userController as any,
      ),
    );

    server = await new Promise<Server>(
      (resolve) => {
        const createdServer = app.listen(
          0,
          () => resolve(createdServer),
        );
      },
    );

    const address = server.address();

    if (
      !address ||
      typeof address === "string"
    ) {
      throw new Error(
        "Unable to determine test server address",
      );
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>(
      (resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      },
    );
  });

  // ---------------------------------------------------------------------------
  // GET /api/v1/users/:id
  // ---------------------------------------------------------------------------

  it("should route GET /api/v1/users/:id to getById", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/users/user-1`,
    );

    expect(response.status).toBe(200);

    expect(
      userController.getById,
    ).toHaveBeenCalledTimes(1);

    const body = await response.json();

    expect(body).toEqual({
      success: true,
      data: {
        id: "user-1",
      },
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/v1/users
  // ---------------------------------------------------------------------------

  it("should route POST /api/v1/users to create", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "+22890123456",
          name: "Koffi",
        }),
      },
    );

    expect(response.status).toBe(201);

    expect(
      userController.create,
    ).toHaveBeenCalledTimes(1);

    const req =
      userController.create.mock.calls[0][0];

    expect(req.body).toEqual({
      phone: "+22890123456",
      name: "Koffi",
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/v1/users/:id
  // ---------------------------------------------------------------------------

  it("should route PATCH /api/v1/users/:id to update", async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/users/user-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Kodjo",
        }),
      },
    );

    expect(response.status).toBe(200);

    expect(
      userController.update,
    ).toHaveBeenCalledTimes(1);

    const req =
      userController.update.mock.calls[0][0];

    expect(req.params.id).toBe("user-1");
    expect(req.body).toEqual({
      name: "Kodjo",
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/v1/users/:id/phone/verify
  // ---------------------------------------------------------------------------

  it(
    "should route PATCH /api/v1/users/:id/phone/verify to markPhoneAsVerified",
    async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/users/user-1/phone/verify`,
        {
          method: "PATCH",
        },
      );

      expect(response.status).toBe(200);

      expect(
        userController.markPhoneAsVerified,
      ).toHaveBeenCalledTimes(1);

      const req =
        userController.markPhoneAsVerified
          .mock.calls[0][0];

      expect(req.params.id).toBe(
        "user-1",
      );
    },
  );
});
