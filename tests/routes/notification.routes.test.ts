import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNotificationRouter } from "../../src/common/http/routes/notification.routes.js";

describe("NotificationRoutes", () => {
  const controller = {
    getAll: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getRoutes() {
    const router = createNotificationRouter(controller as any);

    return router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
        handlers: layer.route.stack.map(
          (handler: any) => handler.name,
        ),
      }));
  }

  it("should define all notification routes", () => {
  expect(getRoutes()).toEqual(
    expect.arrayContaining([
      {
        path: "/",
        methods: ["get"],
        handlers: expect.any(Array),
      },
      {
        path: "/unread-count",
        methods: ["get"],
        handlers: expect.any(Array),
      },
      {
        path: "/read-all",
        methods: ["patch"],
        handlers: expect.any(Array),
      },
      {
        path: "/:id/read",
        methods: ["patch"],
        handlers: expect.any(Array),
      },
    ]),
  );
});

it("should apply authentication middleware to all routes", () => {
  const router = createNotificationRouter(controller as any);

  const authMiddleware = router.stack.find(
    (layer: any) => layer.name === "requireAuth",
  );

  expect(authMiddleware).toBeDefined();
});

});
