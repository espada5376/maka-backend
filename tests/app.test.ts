import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { UserController } from "../src/controllers/user.controller.js";
import { StoreController } from "../src/controllers/store.controller.js";
import { AuthController } from "../src/controllers/auth.controller.js";

import type { AppDependencies } from "../src/app-dependencies.js";
import type { ProductImageController } from "../src/controllers/product-image.controller.js";
import type { ProductController } from "../src/controllers/product.controller.js";

import { createApp } from "../src/app.js";
import type { Session } from "../src/database/repositories/session.repository.js";
import { SessionService } from "../src/services/session.service.js";


function createTestApp(
  overrides: Partial<AppDependencies> = {},
) {
  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn(),
  } as unknown as SessionService;

  const userController = {
    getById: vi.fn(),
    update: vi.fn(),
  } as unknown as UserController;

  const storeController = {
    create: vi.fn(),
    getByOwnerId: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  } as unknown as StoreController;

  const authController = {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn(),
  } as unknown as AuthController;

  const productController = {
    create: vi.fn(),
    getById: vi.fn(),
    getByStore: vi.fn(),
    getAvailableByStore: vi.fn(),
    getByCategory: vi.fn(),
    update: vi.fn(),
    setAvailability: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  } as unknown as ProductController;

  const productImageController = {
    create: vi.fn(),
    reorder: vi.fn(),
  } as unknown as ProductImageController;

  return createApp({
    sessionService,
    userController,
    storeController,
    authController,
    productController,
    productImageController,
    ...overrides,
  });
}



describe("app", () => {
  it("should reuse a valid session", async () => {
    const session: Session = {
      id: "session-1",
      user_id: "user-1",
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    };

    const sessionService = {
      getValidById: vi.fn().mockResolvedValue(session),
      create: vi.fn(),
    } as unknown as SessionService;

    const app = createTestApp({ sessionService });

    app.get("/test-session", (req: Request, res: Response) => {
      res.status(200).json(req.session);
    });

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/test-session`,
        {
          headers: {
            Cookie: "session_id=session-1",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        id: "session-1",
        user_id: "user-1",
      });

      expect(sessionService.getValidById).toHaveBeenCalledWith("session-1");

      expect(sessionService.create).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });

  it("should mount the user routes", async () => {
    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: "session-1",
        user_id: null,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }),
    } as unknown as SessionService;

    const userController = {
      getById: vi.fn((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: req.params.id,
          },
        });
      }),
      create: vi.fn(),
      update: vi.fn(),
      markPhoneAsVerified: vi.fn(),
    } as unknown as UserController;

    const app = createTestApp({
  sessionService,
  userController,
});

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/users/user-1`,
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        success: true,
        data: {
          id: "user-1",
        },
      });

      expect(userController.getById).toHaveBeenCalledOnce();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });

  it("should mount the store routes", async () => {
  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }),
  } as unknown as SessionService;

  const storeController = {
    create: vi.fn(),
    getByOwnerId: vi.fn(),
    getById: vi.fn((req, res) => {
      res.status(200).json({
        success: true,
        data: {
          id: req.params.id,
        },
      });
    }),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
  } as unknown as StoreController;

  const app = createTestApp({
  sessionService,
  storeController,
});

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/stores/store-1`,
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: "store-1",
      },
    });

    expect(storeController.getById).toHaveBeenCalledOnce();
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

  it("should create an anonymous session when no session cookie exists", async () => {
    const session: Session = {
      id: "session-new",
      user_id: null,
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    };

    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue(session),
    } as unknown as SessionService;

    const app = createTestApp({ sessionService });

    app.get("/test-session", (req: Request, res: Response) => {
      res.status(200).json(req.session);
    });

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/test-session`,
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        id: "session-new",
        user_id: null,
      });

      expect(sessionService.getValidById).not.toHaveBeenCalled();
      expect(sessionService.create).toHaveBeenCalledOnce();

      const setCookie = response.headers.get("set-cookie");

      expect(setCookie).toContain("session_id=session-new");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });

it("should mount the auth OTP request route", async () => {
  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: "session-1",
      user_id: null,
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }),
  } as unknown as SessionService;

  const authController = {
    requestOtp: vi.fn((req, res) => {
      expect(req.session.id).toBe("session-1");
      expect(req.session.user_id).toBeNull();
      expect(req.body.phone).toBe("+228 90 12 34 56"); 

      res.status(200).json({
        success: true,
        data: {
          expiresIn: 300,
        },
      });
    }),
    verifyOtp: vi.fn(),
  } as unknown as AuthController;

  const app = createTestApp({
  sessionService,
  authController,
});

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/auth/otp/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  phone: "+228 90 12 34 56",
  sessionId: "fake-session-id",
}),
      },
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        expiresIn: 300,
      },
    });

    expect(authController.requestOtp).toHaveBeenCalledOnce();
    expect(sessionService.create).toHaveBeenCalledOnce();

    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).toContain("session_id=session-1");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

it("should mount the auth OTP verify route using the existing session", async () => {
  const session: Session = {
    id: "session-1",
    user_id: null,
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  const sessionService = {
    getValidById: vi.fn().mockResolvedValue(session),
    create: vi.fn(),
  } as unknown as SessionService;

  const authController = {
    requestOtp: vi.fn(),
    verifyOtp: vi.fn((req, res) => {
  expect(req.session.id).toBe("session-1");
  expect(req.session.user_id).toBeNull();
  expect(req.body.phone).toBe("+228 90 12 34 56");
expect(req.body.code).toBe("123456");

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: "user-1",
            phone: "+22890000000",
          },
        },
      });
    }),
  } as unknown as AuthController;

  const app = createTestApp({
  sessionService,
  authController,
});

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/auth/otp/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session_id=session-1",
        },
        body: JSON.stringify({
  phone: "+228 90 12 34 56",
  code: "123456",
}),
      },
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        user: {
          id: "user-1",
          phone: "+22890000000",
        },
      },
    });

    expect(sessionService.getValidById).toHaveBeenCalledWith("session-1");
    expect(sessionService.create).not.toHaveBeenCalled();

    expect(authController.verifyOtp).toHaveBeenCalledOnce();
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

});


});
