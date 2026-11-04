
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEventRouter } from "../../src/common/http/routes/event.routes.js";

describe("EventRoutes", () => {
  const controller = {
    record: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getRoutes() {
    const router = createEventRouter(controller as any);

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

  it("should define the event creation route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/",
      methods: ["post"],
      handlers: expect.any(Array),
    });
  });

  
  it("should register body validation before the controller", () => {
    const router = createEventRouter(controller as any);

    const route = router.stack.find(
      (layer: any) => layer.route?.path === "/",
    ) as any;

    expect(route).toBeDefined();
    expect(route.route.methods.post).toBe(true);
    expect(route.route.stack).toHaveLength(2);
  });

});
