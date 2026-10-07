import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRouter } from "../../src/routes/category.routes.js";

describe("CategoryRoutes", () => {
  const controller = {
    getById: vi.fn(),
    getBySlug: vi.fn(),
    getChildren: vi.fn(),
    getRootCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getRoutes() {
    const router = createCategoryRouter(controller as any);

    return router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }));
  }

  it("should define the root categories route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/",
      methods: ["get"],
    });
  });

  it("should define the get by slug route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/slug/:slug",
      methods: ["get"],
    });
  });

  it("should define the get by id route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/:id",
      methods: ["get"],
    });
  });

  it("should define the children route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/:id/children",
      methods: ["get"],
    });
  });

  it("should define the create route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/",
      methods: ["post"],
    });
  });

  it("should define the update route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/:id",
      methods: ["patch"],
    });
  });
});
