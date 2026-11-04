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

import { createUserRouter } from "../../src/common/http/routes/user.routes.js";

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

updateMe: vi.fn(
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        id: "user-1",
      },
    });
  },
),
  
 getMe: vi.fn(
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
    
app.use((req, _res, next) => {
  req.session = {
    user_id: req.headers["x-test-user-id"] || null,
  } as any;

  next();
});


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


it("should define GET /me with authentication middleware", async () => {
  const router = createUserRouter(userController as any);

  const meRoute = router.stack.find(
    (layer: any) => layer.route?.path === "/me",
  );

  expect(meRoute).toBeDefined();

  expect(meRoute?.route.methods.get).toBe(true);

  expect(
    meRoute?.route.stack.some(
      (handler: any) => handler.name === "requireAuth",
    ),
  ).toBe(true);
});

it("should define PATCH /me with authentication middleware", () => {
  const router = createUserRouter(userController as any);

  const meRoute = router.stack.find(
  (layer: any) =>
    layer.route?.path === "/me" &&
    layer.route.methods.patch,
);

  expect(meRoute).toBeDefined();
  expect(meRoute?.route.methods.patch).toBe(true);

  expect(
    meRoute?.route.stack.some(
      (handler: any) => handler.name === "requireAuth",
    ),
  ).toBe(true);
});

it("should route PATCH /me to updateMe", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
  "Content-Type": "application/json",
  "x-test-user-id": "user-1",
},
    body: JSON.stringify({
      name: "Kodjo",
    }),
  });

  expect(response.status).toBe(200);
  expect(userController.updateMe).toHaveBeenCalledTimes(1);

  const req = userController.updateMe.mock.calls[0][0];

  expect(req.session.user_id).toBe("user-1");
  expect(req.body).toEqual({
    name: "Kodjo",
  });
});

it("should reject PATCH /me for an anonymous user", async () => {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Kodjo",
    }),
  });

  expect(response.status).toBe(401);
  expect(userController.updateMe).not.toHaveBeenCalled();
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

  it("should not expose POST /api/v1/users", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/users`,
    { method: "POST" },
  );

  expect(response.status).toBe(404);
  expect(userController.create).not.toHaveBeenCalled();
});

it("should not expose PATCH /api/v1/users/:id/phone/verify", async () => {
  const response = await fetch(
    `${baseUrl}/api/v1/users/user-1/phone/verify`,
    { method: "PATCH" },
  );

  expect(response.status).toBe(404);
  expect(
    userController.markPhoneAsVerified,
  ).not.toHaveBeenCalled();
});
});
