import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRouter } from "../../src/common/http/routes/category.routes.js";

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
      handlers: layer.route.stack.map(
        (handler: any) => handler.name,
      ),
    }));
}


  it("should define the root categories route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/",
      methods: ["get"],
handlers: expect.any(Array),
    });
  });

  it("should define the get by slug route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/slug/:slug",
      methods: ["get"],
handlers: expect.any(Array),
    });
  });

  it("should define the get by id route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/:id",
      methods: ["get"],
handlers: expect.any(Array),
    });
  });

  it("should define the children route", () => {
    expect(getRoutes()).toContainEqual({
      path: "/:id/children",
      methods: ["get"],
handlers: expect.any(Array),
    });
  });

  it("should define the protected create route", () => {
  const route = getRoutes().find(
    (item) => item.path === "/" && item.methods.includes("post"),
  );

  expect(route).toBeDefined();
  expect(route!.handlers).toContain("requireAdminKey");
});

it("should define the protected update route", () => {
  const route = getRoutes().find(
    (item) => item.path === "/:id" && item.methods.includes("patch"),
  );

  expect(route).toBeDefined();
  expect(route!.handlers).toContain("requireAdminKey");
});
});
