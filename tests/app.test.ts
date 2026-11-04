import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { UserController } from "../src/controllers/user.controller.js";
import { StoreController } from "../src/controllers/store.controller.js";
import { AuthController } from "../src/controllers/auth.controller.js";
import type { EventController } from "../src/controllers/event.controller.js";

import type { AppDependencies } from "../src/app-dependencies.js";
import type { ProductImageController } from "../src/controllers/product-image.controller.js";
import type { ProductController } from "../src/controllers/product.controller.js";
import type { NotificationController } from "../src/controllers/notification.controller.js";
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
    getMe: vi.fn(),
    updateMe: vi.fn(),
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

    const cartController = {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
  } as unknown as import("../src/controllers/cart.controller.js").CartController;

  const orderController = {
    createFromCart: vi.fn(),
    createDirect: vi.fn(),
    getForCurrentBuyer: vi.fn(),
    getForCurrentBuyerById: vi.fn(),
    getForSeller: vi.fn(),
    updateStatusBySeller: vi.fn(),
  } as unknown as import("../src/controllers/order.controller.js").OrderController;

    const categoryController = {
    getRootCategories: vi.fn(),
    getBySlug: vi.fn(),
    getChildren: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as import("../src/controllers/category.controller.js").CategoryController;

    const eventController = {
    record: vi.fn(),
  } as unknown as EventController;

  const notificationController = {
  getAll: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
} as unknown as NotificationController;

  return createApp({
    sessionService,
    userController,
    storeController,
    authController,
    productController,
    productImageController,
    cartController,
    orderController,
    categoryController,
    eventController,
    notificationController,
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
      getMe: vi.fn(),
      updateMe: vi.fn(),
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

it("should return the current authenticated user", async () => {
  const session: Session = {
    id: "session-me",
    user_id: "user-me",
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  const sessionService = {
    getValidById: vi.fn().mockResolvedValue(session),
    create: vi.fn(),
  } as unknown as SessionService;

  const userController = {
    getById: vi.fn(),
    updateMe: vi.fn(),
    getMe: vi.fn((req, res) => {
      expect(req.session.user_id).toBe("user-me");

      res.status(200).json({
        success: true,
        data: {
          id: "user-me",
          phone: "+22890000000",
        },
      });
    }),
    update: vi.fn(),
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
      `http://127.0.0.1:${address.port}/api/v1/users/me`,
      {
        headers: {
          Cookie: "session_id=session-me",
        },
      },
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        id: "user-me",
        phone: "+22890000000",
      },
    });

    expect(sessionService.getValidById).toHaveBeenCalledWith("session-me");
    expect(userController.getMe).toHaveBeenCalledOnce();
    expect(userController.getById).not.toHaveBeenCalled();
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

it("should reject GET /users/me for an anonymous user", async () => {
  const anonymousSession: Session = {
    id: "session-anonymous-me",
    user_id: null,
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn().mockResolvedValue(anonymousSession),
  } as unknown as SessionService;

  const userController = {
    getById: vi.fn(),
    getMe: vi.fn(),
    updateMe: vi.fn(),
    update: vi.fn(),
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
      `http://127.0.0.1:${address.port}/api/v1/users/me`,
    );

    expect(response.status).toBe(401);

    expect(userController.getMe).not.toHaveBeenCalled();
    expect(sessionService.create).toHaveBeenCalledOnce();
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



  it("should mount the event creation route", async () => {
    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: "session-event",
        user_id: null,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }),
    } as unknown as SessionService;

    const eventController = {
      record: vi.fn((req, res) => {
        expect(req.session.id).toBe("session-event");
        expect(req.session.user_id).toBeNull();

        res.status(201).json({
          success: true,
          data: { id: "event-1" },
        });
      }),
    } as unknown as EventController;

    const app = createTestApp({
      sessionService,
      eventController,
    });

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "store.viewed",
            storeId: "store-1",
          }),
        },
      );

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toEqual({
        success: true,
        data: { id: "event-1" },
      });

      expect(sessionService.create).toHaveBeenCalledOnce();
      expect(eventController.record).toHaveBeenCalledOnce();
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

	it("should preserve product.shared event data when calling the controller", async () => {
  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: "session-event",
      user_id: null,
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    }),
  } as unknown as SessionService;

  const eventController = {
    record: vi.fn((req, res) => {
      expect(req.body).toEqual({
        name: "product.shared",
        storeId: "store-1",
        productId: "product-1",
        eventKey: "share-event-key",
        metadata: {
          channel: "whatsapp",
        },
      });

      res.status(201).json({
        success: true,
        data: { id: "event-2" },
      });
    }),
  } as unknown as EventController;

  const app = createTestApp({
    sessionService,
    eventController,
  });

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "product.shared",
          storeId: "store-1",
          productId: "product-1",
          eventKey: "share-event-key",
          metadata: {
            channel: "whatsapp",
          },
        }),
      },
    );

    expect(response.status).toBe(201);
    expect(eventController.record).toHaveBeenCalledOnce();
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


  it("should reject an invalid event before calling the controller", async () => {
    const eventController = {
      record: vi.fn(),
    } as unknown as EventController;

    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: "session-event",
        user_id: null,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }),
    } as unknown as SessionService;

    const app = createTestApp({
      sessionService,
      eventController,
    });

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "store.shared",
            storeId: "store-1",
          }),
        },
      );

      expect(response.status).toBe(400);
      expect(eventController.record).not.toHaveBeenCalled();
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

it("should mount the notification routes for an authenticated user", async () => {
  const session: Session = {
    id: "session-notification",
    user_id: "user-notification",
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  const sessionService = {
    getValidById: vi.fn().mockResolvedValue(session),
    create: vi.fn(),
  } as unknown as SessionService;

  const notificationController = {
    getAll: vi.fn((_req, res) => {
      res.status(200).json({
        success: true,
        data: [{ id: "notification-1" }],
      });
    }),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  } as unknown as NotificationController;

  const app = createTestApp({
    sessionService,
    notificationController,
  });

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/notifications`,
      {
        headers: {
          Cookie: "session_id=session-notification",
        },
      },
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "notification-1" }],
    });

    expect(sessionService.getValidById).toHaveBeenCalledWith(
      "session-notification",
    );

    expect(notificationController.getAll).toHaveBeenCalledOnce();
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

it("should reject notification routes for an anonymous user", async () => {
  const anonymousSession: Session = {
    id: "session-anonymous",
    user_id: null,
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  const sessionService = {
    getValidById: vi.fn(),
    create: vi.fn().mockResolvedValue(anonymousSession),
  } as unknown as SessionService;

  const notificationController = {
    getAll: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  } as unknown as NotificationController;

  const app = createTestApp({
    sessionService,
    notificationController,
  });

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/notifications`,
    );

    expect(response.status).toBe(401);
    expect(notificationController.getAll).not.toHaveBeenCalled();
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
