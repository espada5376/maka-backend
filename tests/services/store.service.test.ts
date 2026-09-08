import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: {
    transaction: vi.fn(),
  },

  productRepository: {
    findById: vi.fn(),
    findByStoreId: vi.fn(),
    findByCategoryId: vi.fn(),
    findAvailableByStoreId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setAvailability: vi.fn(),
    setStatus: vi.fn(),
  },

  sessionRepository: {
    findById: vi.fn(),
  },

  storeRepository: {
    findById: vi.fn(),
    findByOwnerId: vi.fn(),
  },

  categoryRepository: {
    findById: vi.fn(),
  },

  eventRepository: {
    create: vi.fn(),
  },
}));

vi.mock("../../src/database/knex.js", () => ({
  default: mocks.database,
}));

vi.mock("../../src/database/repositories/product.repository.js", () => ({
  ProductRepository: vi.fn().mockImplementation(() => mocks.productRepository),
}));

vi.mock("../../src/database/repositories/session.repository.js", () => ({
  SessionRepository: vi.fn().mockImplementation(() => mocks.sessionRepository),
}));

vi.mock("../../src/database/repositories/store.repository.js", () => ({
  StoreRepository: vi.fn().mockImplementation(() => mocks.storeRepository),
}));

vi.mock("../../src/database/repositories/category.repository.js", () => ({
  CategoryRepository: vi
    .fn()
    .mockImplementation(() => mocks.categoryRepository),
}));

vi.mock("../../src/database/repositories/event.repository.js", () => ({
  EventRepository: vi.fn().mockImplementation(() => mocks.eventRepository),
}));

import {
  ProductService,
  type CreateProductInput,
  type UpdateProductInput,
} from "../../src/services/product.service.js";

describe("ProductService", () => {
  let service: ProductService;

  const session = {
    id: "session-1",
    user_id: "user-1",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const anonymousSession = {
    id: "session-anonymous",
    user_id: null,
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const expiredSession = {
    id: "session-expired",
    user_id: "user-1",
    expires_at: new Date(Date.now() - 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const activeStore = {
    id: "store-1",
    owner_id: "user-1",
    name: "Test Store",
    description: null,
    country: "TG",
    city: "Lome",
    currency: "XOF",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const inactiveStore = {
    ...activeStore,
    status: "inactive" as const,
  };

  const otherOwnerStore = {
    ...activeStore,
    id: "store-2",
    owner_id: "user-2",
  };

  const activeCategory = {
    id: "category-1",
    parent_id: null,
    name: "Cosmetics",
    slug: "cosmetics",
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const inactiveCategory = {
    ...activeCategory,
    status: "inactive" as const,
  };

  const activeProduct = {
    id: "product-1",
    store_id: "store-1",
    category_id: "category-1",
    name: "Lipstick",
    description: "Red lipstick",
    price: "5000.00",
    availability: "available" as const,
    status: "active" as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const unavailableProduct = {
    ...activeProduct,
    availability: "unavailable" as const,
  };

  const archivedProduct = {
    ...activeProduct,
    status: "archived" as const,
    availability: "unavailable" as const,
  };

  const secondProduct = {
    ...activeProduct,
    id: "product-2",
    name: "Foundation",
  };

  const createInput: CreateProductInput = {
    category_id: "category-1",
    name: "Lipstick",
    description: "Red lipstick",
    price: 5000,
  };

  const updateInput: UpdateProductInput = {
    category_id: "category-1",
    name: "Updated Lipstick",
    description: "Updated description",
    price: 6500,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ProductService(
      mocks.database as any,
      mocks.productRepository as any,
      mocks.sessionRepository as any,
      mocks.storeRepository as any,
      mocks.categoryRepository as any,
    );

    /*
     * IMPORTANT :
     * Chaque test repart d'un store actif.
     *
     * Cela empêche un test qui configure un store "inactive"
     * de contaminer les tests suivants.
     */
    mocks.sessionRepository.findById.mockResolvedValue(session);

    mocks.storeRepository.findByOwnerId.mockResolvedValue(activeStore);
    mocks.storeRepository.findById.mockResolvedValue(activeStore);

    mocks.categoryRepository.findById.mockResolvedValue(activeCategory);

    mocks.productRepository.findById.mockResolvedValue(activeProduct);
    mocks.productRepository.findByStoreId.mockResolvedValue([
      activeProduct,
      secondProduct,
    ]);
    mocks.productRepository.findByCategoryId.mockResolvedValue([activeProduct]);
    mocks.productRepository.findAvailableByStoreId.mockResolvedValue([
      activeProduct,
    ]);

    mocks.database.transaction.mockImplementation(async (callback: any) => {
      return callback(mocks.database);
    });

    mocks.productRepository.create.mockResolvedValue(activeProduct);
    mocks.productRepository.update.mockResolvedValue({
      ...activeProduct,
      name: "Updated Lipstick",
      description: "Updated description",
      price: "6500.00",
    });

    mocks.productRepository.setAvailability.mockResolvedValue(
      unavailableProduct,
    );

    mocks.productRepository.setStatus.mockResolvedValue(archivedProduct);

    mocks.eventRepository.create.mockResolvedValue({
      id: "event-1",
      event_name: "product.created",
    });
  });

  // ============================================================
  // CREATE
  // ============================================================

  describe("create", () => {
    it("should create a product successfully", async () => {
      const result = await service.create("session-1", createInput);

      expect(result).toEqual(activeProduct);

      expect(mocks.productRepository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        category_id: "category-1",
        name: "Lipstick",
        description: "Red lipstick",
        price: 5000,
        availability: "available",
        status: "active",
      });
    });

    it("should authenticate the session before creating", async () => {
      await service.create("session-1", createInput);

      expect(mocks.sessionRepository.findById).toHaveBeenCalledWith(
        "session-1",
      );
    });

    it("should reject when the session does not exist", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.create("session-1", createInput),
      ).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the session is expired", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(expiredSession);

      await expect(
        service.create("session-expired", createInput),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the session is anonymous", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(anonymousSession);

      await expect(
        service.create("session-anonymous", createInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the seller does not have a store", async () => {
      mocks.storeRepository.findByOwnerId.mockResolvedValue(undefined);

      await expect(
        service.create("session-1", createInput),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the seller store is inactive", async () => {
      mocks.storeRepository.findByOwnerId.mockResolvedValue(inactiveStore);

      await expect(
        service.create("session-1", createInput),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the category does not exist", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.create("session-1", createInput),
      ).rejects.toMatchObject({
        code: "CATEGORY_NOT_FOUND",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should reject when the category is inactive", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(inactiveCategory);

      await expect(
        service.create("session-1", createInput),
      ).rejects.toMatchObject({
        code: "CATEGORY_INACTIVE",
      });

      expect(mocks.productRepository.create).not.toHaveBeenCalled();
    });

    it("should trim the product name", async () => {
      await service.create("session-1", {
        ...createInput,
        name: "   Lipstick   ",
      });

      expect(mocks.productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Lipstick",
        }),
      );
    });

    it("should reject an empty product name", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          name: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject a product name longer than 150 characters", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          name: "a".repeat(151),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should accept a product name of exactly 150 characters", async () => {
      await service.create("session-1", {
        ...createInput,
        name: "a".repeat(150),
      });

      expect(mocks.productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "a".repeat(150),
        }),
      );
    });

    it("should reject a zero price", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          price: 0,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject a negative price", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          price: -100,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject NaN as price", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          price: Number.NaN,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject Infinity as price", async () => {
      await expect(
        service.create("session-1", {
          ...createInput,
          price: Number.POSITIVE_INFINITY,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should use XOF through the product/store architecture", async () => {
      await service.create("session-1", createInput);

      expect(mocks.productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: "store-1",
        }),
      );

      expect(activeStore.currency).toBe("XOF");
    });

    it("should create the product as active and available", async () => {
      await service.create("session-1", createInput);

      expect(mocks.productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          availability: "available",
          status: "active",
        }),
      );
    });

    it("should create product.created event", async () => {
      await service.create("session-1", createInput);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.created",
        session_id: "session-1",
        user_id: "user-1",
        store_id: "store-1",
        product_id: "product-1",
        metadata: {},
      });
    });

    it("should create product and event inside the same transaction", async () => {
      const executionOrder: string[] = [];

      mocks.productRepository.create.mockImplementation(async () => {
        executionOrder.push("product");
        return activeProduct;
      });

      mocks.eventRepository.create.mockImplementation(async () => {
        executionOrder.push("event");
        return {
          id: "event-1",
        };
      });

      await service.create("session-1", createInput);

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
      expect(executionOrder).toEqual(["product", "event"]);
    });

    it("should propagate product creation errors", async () => {
      mocks.productRepository.create.mockRejectedValue(
        new Error("database error"),
      );

      await expect(service.create("session-1", createInput)).rejects.toThrow(
        "database error",
      );
    });

    it("should propagate event creation errors", async () => {
      mocks.eventRepository.create.mockRejectedValue(new Error("event error"));

      await expect(service.create("session-1", createInput)).rejects.toThrow(
        "event error",
      );
    });

    it("should keep a null description when none is provided", async () => {
      await service.create("session-1", {
        category_id: "category-1",
        name: "Lipstick",
        price: 5000,
      });

      expect(mocks.productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });
  });

  // ============================================================
  // GET BY ID
  // ============================================================

  describe("getById", () => {
    it("should return the product", async () => {
      const result = await service.getById("product-1");

      expect(result).toEqual(activeProduct);
      expect(mocks.productRepository.findById).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(service.getById("product-unknown")).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should not require authentication for public product reading", async () => {
      await service.getById("product-1");

      expect(mocks.sessionRepository.findById).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // GET BY STORE
  // ============================================================

  describe("getByStore", () => {
    it("should return products belonging to the store", async () => {
      const result = await service.getByStore("store-1");

      expect(result).toEqual([activeProduct, secondProduct]);

      expect(mocks.productRepository.findByStoreId).toHaveBeenCalledWith(
        "store-1",
      );
    });

    it("should return an empty array when the store has no products", async () => {
      mocks.productRepository.findByStoreId.mockResolvedValue([]);

      const result = await service.getByStore("store-1");

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // GET BY CATEGORY
  // ============================================================

  describe("getByCategory", () => {
    it("should return products belonging to the category", async () => {
      const result = await service.getByCategory("category-1");

      expect(result).toEqual([activeProduct]);

      expect(mocks.productRepository.findByCategoryId).toHaveBeenCalledWith(
        "category-1",
      );
    });

    it("should return an empty array when the category has no products", async () => {
      mocks.productRepository.findByCategoryId.mockResolvedValue([]);

      const result = await service.getByCategory("category-1");

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // GET AVAILABLE BY STORE
  // ============================================================

  describe("getAvailableByStore", () => {
    it("should return only available products", async () => {
      const result = await service.getAvailableByStore("store-1");

      expect(result).toEqual([activeProduct]);

      expect(
        mocks.productRepository.findAvailableByStoreId,
      ).toHaveBeenCalledWith("store-1");
    });

    it("should return an empty array when there are no available products", async () => {
      mocks.productRepository.findAvailableByStoreId.mockResolvedValue([]);

      const result = await service.getAvailableByStore("store-1");

      expect(result).toEqual([]);
    });
  });

  // ============================================================
  // UPDATE
  // ============================================================

  describe("update", () => {
    it("should update a product successfully", async () => {
      const result = await service.update(
        "session-1",
        "product-1",
        updateInput,
      );

      expect(result).toEqual(
        expect.objectContaining({
          name: "Updated Lipstick",
          description: "Updated description",
          price: "6500.00",
        }),
      );

      expect(mocks.productRepository.update).toHaveBeenCalledWith("product-1", {
        category_id: "category-1",
        name: "Updated Lipstick",
        description: "Updated description",
        price: 6500,
      });
    });

    it("should require an authenticated session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(anonymousSession);

      await expect(
        service.update("session-anonymous", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });

      expect(mocks.productRepository.update).not.toHaveBeenCalled();
    });

    it("should reject an expired session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(expiredSession);

      await expect(
        service.update("session-expired", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.update("session-1", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject when the product store does not exist", async () => {
      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.update("session-1", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should reject when the seller does not own the product store", async () => {
      mocks.storeRepository.findById.mockResolvedValue(otherOwnerStore);

      await expect(
        service.update("session-1", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });
    });

    it("should reject when the product store is inactive", async () => {
      mocks.storeRepository.findById.mockResolvedValue(inactiveStore);

      await expect(
        service.update("session-1", "product-1", updateInput),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should validate the new category", async () => {
      await service.update("session-1", "product-1", {
        category_id: "category-1",
      });

      expect(mocks.categoryRepository.findById).toHaveBeenCalledWith(
        "category-1",
      );
    });

    it("should reject when the new category does not exist", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.update("session-1", "product-1", {
          category_id: "unknown-category",
        }),
      ).rejects.toMatchObject({
        code: "CATEGORY_NOT_FOUND",
      });
    });

    it("should reject when the new category is inactive", async () => {
      mocks.categoryRepository.findById.mockResolvedValue(inactiveCategory);

      await expect(
        service.update("session-1", "product-1", {
          category_id: "category-1",
        }),
      ).rejects.toMatchObject({
        code: "CATEGORY_INACTIVE",
      });
    });

    it("should trim the updated product name", async () => {
      await service.update("session-1", "product-1", {
        name: "   New Name   ",
      });

      expect(mocks.productRepository.update).toHaveBeenCalledWith("product-1", {
        name: "New Name",
      });
    });

    it("should reject an empty updated name", async () => {
      await expect(
        service.update("session-1", "product-1", {
          name: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject an updated name longer than 150 characters", async () => {
      await expect(
        service.update("session-1", "product-1", {
          name: "a".repeat(151),
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject an invalid updated price", async () => {
      await expect(
        service.update("session-1", "product-1", {
          price: 0,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should allow updating only the description", async () => {
      await service.update("session-1", "product-1", {
        description: "New description",
      });

      expect(mocks.productRepository.update).toHaveBeenCalledWith("product-1", {
        description: "New description",
      });
    });

    it("should not allow changing the store through the update input", async () => {
      await service.update("session-1", "product-1", {
        category_id: "category-1",
        name: "Updated",
        price: 7000,
      });

      const updateCall = mocks.productRepository.update.mock.calls[0][1];

      expect(updateCall).not.toHaveProperty("store_id");
      expect(updateCall).not.toHaveProperty("status");
      expect(updateCall).not.toHaveProperty("availability");
    });

    it("should create a product.updated event", async () => {
      await service.update("session-1", "product-1", {
        name: "Updated",
      });

      expect(mocks.eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.updated",
        session_id: "session-1",
        user_id: "user-1",
        store_id: "store-1",
        product_id: "product-1",
        metadata: {},
      });
    });

    it("should update the product and event inside a transaction", async () => {
      expect(mocks.database.transaction).not.toHaveBeenCalled();

      await service.update("session-1", "product-1", {
        name: "Updated",
      });

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject if the product disappears during update", async () => {
      mocks.productRepository.update.mockResolvedValue(undefined);

      await expect(
        service.update("session-1", "product-1", {
          name: "Updated",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });
  });

  // ============================================================
  // SET AVAILABILITY
  // ============================================================

  describe("setAvailability", () => {
    it("should make an available product unavailable", async () => {
      mocks.productRepository.setAvailability.mockResolvedValue(
        unavailableProduct,
      );

      const result = await service.setAvailability(
        "session-1",
        "product-1",
        "unavailable",
      );

      expect(result).toEqual(unavailableProduct);

      expect(mocks.productRepository.setAvailability).toHaveBeenCalledWith(
        "product-1",
        "unavailable",
      );
    });

    it("should make an unavailable product available", async () => {
      mocks.productRepository.findById.mockResolvedValue(unavailableProduct);

      const availableAgain = {
        ...activeProduct,
        availability: "available" as const,
      };

      mocks.productRepository.setAvailability.mockResolvedValue(availableAgain);

      const result = await service.setAvailability(
        "session-1",
        "product-1",
        "available",
      );

      expect(result).toEqual(availableAgain);

      expect(mocks.productRepository.setAvailability).toHaveBeenCalledWith(
        "product-1",
        "available",
      );
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.setAvailability("session-1", "product-1", "unavailable"),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject when the seller does not own the product", async () => {
      mocks.storeRepository.findById.mockResolvedValue(otherOwnerStore);

      await expect(
        service.setAvailability("session-1", "product-1", "unavailable"),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });
    });

    it("should reject when the store is inactive", async () => {
      mocks.storeRepository.findById.mockResolvedValue(inactiveStore);

      await expect(
        service.setAvailability("session-1", "product-1", "unavailable"),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject availability change on an archived product", async () => {
      mocks.productRepository.findById.mockResolvedValue(archivedProduct);

      await expect(
        service.setAvailability("session-1", "product-1", "available"),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATUS_TRANSITION",
      });
    });

    it("should reject an invalid availability value", async () => {
      await expect(
        service.setAvailability("session-1", "product-1", "invalid" as any),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT",
      });
    });

    it("should reject when the requested availability is already active", async () => {
      await expect(
        service.setAvailability("session-1", "product-1", "available"),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATUS_TRANSITION",
      });
    });

    it("should reject when the requested availability is already unavailable", async () => {
      mocks.productRepository.findById.mockResolvedValue(unavailableProduct);

      await expect(
        service.setAvailability("session-1", "product-1", "unavailable"),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATUS_TRANSITION",
      });
    });

    it("should create a product.availability_changed event", async () => {
      mocks.productRepository.setAvailability.mockResolvedValue(
        unavailableProduct,
      );

      await service.setAvailability("session-1", "product-1", "unavailable");

      expect(mocks.eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.availability_changed",
        session_id: "session-1",
        user_id: "user-1",
        store_id: "store-1",
        product_id: "product-1",
        metadata: {
          from: "available",
          to: "unavailable",
        },
      });
    });

    it("should execute the availability change inside a transaction", async () => {
      await service.setAvailability("session-1", "product-1", "unavailable");

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // ARCHIVE
  // ============================================================

  describe("archive", () => {
    it("should archive an active product", async () => {
      mocks.productRepository.setStatus.mockResolvedValue(archivedProduct);

      const result = await service.archive("session-1", "product-1");

      expect(result).toEqual(archivedProduct);

      expect(mocks.productRepository.setStatus).toHaveBeenCalledWith(
        "product-1",
        "archived",
      );
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.archive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject when the seller does not own the product", async () => {
      mocks.storeRepository.findById.mockResolvedValue(otherOwnerStore);

      await expect(
        service.archive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });
    });

    it("should reject when the store is inactive", async () => {
      mocks.storeRepository.findById.mockResolvedValue(inactiveStore);

      await expect(
        service.archive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject archiving an already archived product", async () => {
      mocks.productRepository.findById.mockResolvedValue(archivedProduct);

      await expect(
        service.archive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATUS_TRANSITION",
      });
    });

    it("should create a product.archived event", async () => {
      mocks.productRepository.setStatus.mockResolvedValue(archivedProduct);

      await service.archive("session-1", "product-1");

      expect(mocks.eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.archived",
        session_id: "session-1",
        user_id: "user-1",
        store_id: "store-1",
        product_id: "product-1",
        metadata: {},
      });
    });

    it("should execute archive and event inside a transaction", async () => {
      await service.archive("session-1", "product-1");

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject if the product disappears during archive", async () => {
      mocks.productRepository.setStatus.mockResolvedValue(undefined);

      await expect(
        service.archive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });
  });

  // ============================================================
  // UNARCHIVE
  // ============================================================

  describe("unarchive", () => {
    beforeEach(() => {
      mocks.productRepository.findById.mockResolvedValue(archivedProduct);

      mocks.productRepository.setStatus.mockResolvedValue({
        ...archivedProduct,
        status: "active" as const,
      });
    });

    it("should unarchive an archived product", async () => {
      const result = await service.unarchive("session-1", "product-1");

      expect(result).toEqual(
        expect.objectContaining({
          status: "active",
        }),
      );

      expect(mocks.productRepository.setStatus).toHaveBeenCalledWith(
        "product-1",
        "active",
      );
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.unarchive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject when the seller does not own the product", async () => {
      mocks.storeRepository.findById.mockResolvedValue(otherOwnerStore);

      await expect(
        service.unarchive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_FORBIDDEN",
      });
    });

    it("should reject when the store is inactive", async () => {
      mocks.storeRepository.findById.mockResolvedValue(inactiveStore);

      await expect(
        service.unarchive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject unarchiving an active product", async () => {
      mocks.productRepository.findById.mockResolvedValue(activeProduct);

      await expect(
        service.unarchive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "INVALID_PRODUCT_STATUS_TRANSITION",
      });
    });

    it("should create a product.unarchived event", async () => {
      await service.unarchive("session-1", "product-1");

      expect(mocks.eventRepository.create).toHaveBeenCalledWith({
        event_name: "product.unarchived",
        session_id: "session-1",
        user_id: "user-1",
        store_id: "store-1",
        product_id: "product-1",
        metadata: {},
      });
    });

    it("should execute unarchive and event inside a transaction", async () => {
      await service.unarchive("session-1", "product-1");

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
    });

    it("should reject if the product disappears during unarchive", async () => {
      mocks.productRepository.setStatus.mockResolvedValue(undefined);

      await expect(
        service.unarchive("session-1", "product-1"),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });
  });
});
