import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  CartService,
  CartServiceError,
  CartErrorCode,
} from "../../src/services/cart.service.js";

import type { Cart } from "../../src/database/repositories/cart.repository.js";
import type {
  CartItem,
  CartItemWithProductContext,
} from "../../src/database/repositories/cart-item.repository.js";
import type { Product } from "../../src/database/repositories/product.repository.js";
import type { Store } from "../../src/database/repositories/store.repository.js";

const mocks = vi.hoisted(() => ({
  database: {
    transaction: vi.fn(),
  },

  cartRepository: {
    findBySessionId: vi.fn(),
  },

  cartItemRepository: {
    findById: vi.fn(),
    findByCartId: vi.fn(),
    findByCartAndProduct: vi.fn(),
    findByCartIdWithProductContext: vi.fn(),
    create: vi.fn(),
    updateQuantity: vi.fn(),
    delete: vi.fn(),
  },

  productRepository: {
    findById: vi.fn(),
  },

  storeRepository: {
    findById: vi.fn(),
  },

  eventRepository: {
    create: vi.fn(),
  },
}));

vi.mock("../../src/database/knex.js", () => ({
  default: mocks.database,
}));

vi.mock("../../src/database/repositories/cart.repository.js", () => ({
  CartRepository: class {
    findBySessionId = mocks.cartRepository.findBySessionId;
  },
}));

vi.mock("../../src/database/repositories/cart-item.repository.js", () => ({
  CartItemRepository: class {
    findById = mocks.cartItemRepository.findById;
    findByCartId = mocks.cartItemRepository.findByCartId;
    findByCartAndProduct = mocks.cartItemRepository.findByCartAndProduct;
    findByCartIdWithProductContext =
      mocks.cartItemRepository.findByCartIdWithProductContext;
    create = mocks.cartItemRepository.create;
    updateQuantity = mocks.cartItemRepository.updateQuantity;
    delete = mocks.cartItemRepository.delete;
  },
}));

vi.mock("../../src/database/repositories/product.repository.js", () => ({
  ProductRepository: class {
    findById = mocks.productRepository.findById;
  },
}));

vi.mock("../../src/database/repositories/store.repository.js", () => ({
  StoreRepository: class {
    findById = mocks.storeRepository.findById;
  },
}));

vi.mock("../../src/database/repositories/event.repository.js", () => ({
  EventRepository: class {
    create = mocks.eventRepository.create;
  },
}));

describe("CartService", () => {
  let cartService: CartService;

  const sessionId = "session-1";
  const cartId = "cart-1";
  const productId = "product-1";
  const itemId = "item-1";
  const storeId = "store-1";

  const activeStore: Store = {
    id: storeId,
    owner_id: "owner-1",
    name: "Ma Boutique",
    description: null,
    country: "TG",
    city: "Lomé",
    currency: "XOF",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const inactiveStore: Store = {
    ...activeStore,
    status: "inactive",
  };

  const activeProduct: Product = {
    id: productId,
    store_id: storeId,
    category_id: "category-1",
    name: "Produit Test",
    description: null,
    price: "10000.00",
    availability: "available",
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const unavailableProduct: Product = {
    ...activeProduct,
    availability: "unavailable",
  };

  const archivedProduct: Product = {
    ...activeProduct,
    status: "archived",
  };

  const cart: Cart = {
    id: cartId,
    session_id: sessionId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const cartItem: CartItem = {
    id: itemId,
    cart_id: cartId,
    product_id: productId,
    quantity: 2,
    created_at: new Date(),
    updated_at: new Date(),
  };

  function makeContextItem(
    overrides: Partial<CartItemWithProductContext> = {},
  ): CartItemWithProductContext {
    return {
      ...cartItem,
      product_name: activeProduct.name,
      product_price: activeProduct.price,
      product_availability: activeProduct.availability,
      product_status: activeProduct.status,
      product_store_id: activeProduct.store_id,
      store_status: activeStore.status,
      ...overrides,
    };
  }

  function setupActiveProduct() {
    mocks.cartRepository.findBySessionId.mockResolvedValue(cart);
    mocks.productRepository.findById.mockResolvedValue(activeProduct);
    mocks.storeRepository.findById.mockResolvedValue(activeStore);
  }

  function setupTransaction() {
    mocks.database.transaction.mockImplementation(async (callback) => {
      return callback(mocks.database);
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.cartRepository.findBySessionId.mockResolvedValue(cart);
    mocks.cartItemRepository.findByCartId.mockResolvedValue([]);
    mocks.cartItemRepository.findByCartAndProduct.mockResolvedValue(undefined);
    mocks.cartItemRepository.findById.mockResolvedValue(undefined);
    mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
      [],
    );

    mocks.productRepository.findById.mockResolvedValue(activeProduct);
    mocks.storeRepository.findById.mockResolvedValue(activeStore);

    mocks.cartItemRepository.create.mockResolvedValue(cartItem);
    mocks.cartItemRepository.updateQuantity.mockResolvedValue({
      ...cartItem,
      quantity: 5,
    });
    mocks.cartItemRepository.delete.mockResolvedValue(1);

    mocks.eventRepository.create.mockResolvedValue({
      id: "event-1",
    });

    setupTransaction();

    cartService = new CartService(
      mocks.database as any,
      mocks.cartRepository as any,
      mocks.cartItemRepository as any,
      mocks.productRepository as any,
      mocks.storeRepository as any,
    );
  });

  // ---------------------------------------------------------------------------
  // GET CART
  // ---------------------------------------------------------------------------

  describe("getCart", () => {
    it("should return the cart", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [],
      );

      const result = await cartService.getCart(sessionId);

      expect(result).toMatchObject({
        id: cartId,
        session_id: sessionId,
        items: [],
      });

      expect(mocks.cartRepository.findBySessionId).toHaveBeenCalledWith(
        sessionId,
      );
    });

    it("should reject when the cart does not exist", async () => {
      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(cartService.getCart(sessionId)).rejects.toMatchObject({
        code: CartErrorCode.CART_NOT_FOUND,
      });
    });

    it("should load all cart items with product and store context", async () => {
      const contextItem = makeContextItem();

      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [contextItem],
      );

      await cartService.getCart(sessionId);

      expect(
        mocks.cartItemRepository.findByCartIdWithProductContext,
      ).toHaveBeenCalledWith(cartId);
    });

    it("should mark an item as available when store and product are active and product is available", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [makeContextItem()],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: itemId,
        cart_id: cartId,
        product_id: productId,
        quantity: 2,
        state: "available",
      });
    });

    it("should mark an item unavailable when the store is inactive", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [
          makeContextItem({
            store_status: "inactive",
          }),
        ],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items[0].state).toBe("unavailable");
    });

    it("should mark an item unavailable when the product is archived", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [
          makeContextItem({
            product_status: "archived",
          }),
        ],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items[0].state).toBe("unavailable");
    });

    it("should mark an item unavailable when the product is unavailable", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [
          makeContextItem({
            product_availability: "unavailable",
          }),
        ],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items[0].state).toBe("unavailable");
    });

    it("should preserve the item quantity", async () => {
      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [
          makeContextItem({
            quantity: 7,
          }),
        ],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items[0].quantity).toBe(7);
    });

    it("should return multiple items with independent states", async () => {
      const secondProductId = "product-2";

      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [
          makeContextItem({
            id: "item-1",
            product_id: productId,
            state: undefined as never,
          }),
          makeContextItem({
            id: "item-2",
            product_id: secondProductId,
            product_availability: "unavailable",
          }),
        ],
      );

      const result = await cartService.getCart(sessionId);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].state).toBe("available");
      expect(result.items[1].state).toBe("unavailable");
    });
  });

  // ---------------------------------------------------------------------------
  // ADD ITEM
  // ---------------------------------------------------------------------------

  describe("addItem", () => {
    it("should add a valid product to the cart", async () => {
      setupActiveProduct();

      const result = await cartService.addItem(sessionId, productId, 2);

      expect(result).toEqual(cartItem);

      expect(mocks.cartItemRepository.create).toHaveBeenCalledWith({
        cart_id: cartId,
        product_id: productId,
        quantity: 2,
      });
    });

    it("should reject a quantity equal to zero", async () => {
      await expect(
        cartService.addItem(sessionId, productId, 0),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject a negative quantity", async () => {
      await expect(
        cartService.addItem(sessionId, productId, -1),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject a non-integer quantity", async () => {
      await expect(
        cartService.addItem(sessionId, productId, 1.5),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject NaN as a quantity", async () => {
      await expect(
        cartService.addItem(sessionId, productId, Number.NaN),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject Infinity as a quantity", async () => {
      await expect(
        cartService.addItem(sessionId, productId, Infinity),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject when the cart does not exist", async () => {
      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.CART_NOT_FOUND,
      });
    });

    it("should reject when the product does not exist", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.PRODUCT_NOT_FOUND,
      });
    });

    it("should reject when the store does not exist", async () => {
      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.STORE_NOT_FOUND,
      });
    });

    it("should reject when the store is inactive", async () => {
      mocks.storeRepository.findById.mockResolvedValue(inactiveStore);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.STORE_INACTIVE,
      });
    });

    it("should reject when the product is archived", async () => {
      mocks.productRepository.findById.mockResolvedValue(archivedProduct);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.PRODUCT_INACTIVE,
      });
    });

    it("should reject when the product is unavailable", async () => {
      mocks.productRepository.findById.mockResolvedValue(unavailableProduct);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.PRODUCT_UNAVAILABLE,
      });
    });

    it("should create a new item when the product is not already in the cart", async () => {
      setupActiveProduct();

      mocks.cartItemRepository.findByCartId.mockResolvedValue([]);
      mocks.cartItemRepository.findByCartAndProduct.mockResolvedValue(
        undefined,
      );

      await cartService.addItem(sessionId, productId, 3);

      expect(mocks.cartItemRepository.create).toHaveBeenCalledWith({
        cart_id: cartId,
        product_id: productId,
        quantity: 3,
      });
    });

    it("should increase the quantity when the product already exists in the cart", async () => {
      setupActiveProduct();

      const existingItem = {
        ...cartItem,
        quantity: 4,
      };

      mocks.cartItemRepository.findByCartId.mockResolvedValue([existingItem]);

      mocks.cartItemRepository.findByCartAndProduct.mockResolvedValue(
        existingItem,
      );

      await cartService.addItem(sessionId, productId, 3);

      expect(mocks.cartItemRepository.updateQuantity).toHaveBeenCalledWith(
        existingItem.id,
        {
          quantity: 7,
        },
      );
    });

    it("should not create a duplicate item when the product already exists", async () => {
      setupActiveProduct();

      const existingItem = {
        ...cartItem,
        quantity: 4,
      };

      mocks.cartItemRepository.findByCartId.mockResolvedValue([existingItem]);

      mocks.cartItemRepository.findByCartAndProduct.mockResolvedValue(
        existingItem,
      );

      await cartService.addItem(sessionId, productId, 2);

      expect(mocks.cartItemRepository.create).not.toHaveBeenCalled();
    });

    it("should reject products from another store", async () => {
      setupActiveProduct();

      const firstItem = {
        ...cartItem,
        product_id: "product-from-first-store",
      };

      const firstStoreProduct = {
        ...activeProduct,
        id: "product-from-first-store",
        store_id: "store-1",
      };

      const secondStoreProduct = {
        ...activeProduct,
        id: productId,
        store_id: "store-2",
      };

      mocks.cartItemRepository.findByCartId.mockResolvedValue([firstItem]);

      mocks.productRepository.findById.mockImplementation(
        async (id: string) => {
          if (id === firstItem.product_id) {
            return firstStoreProduct;
          }

          if (id === productId) {
            return secondStoreProduct;
          }

          return undefined;
        },
      );

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.MULTIPLE_STORES,
      });
    });

    it("should allow another product from the same store", async () => {
      setupActiveProduct();

      const secondProduct = {
        ...activeProduct,
        id: "product-2",
        name: "Deuxième produit",
      };

      const firstItem = {
        ...cartItem,
        product_id: productId,
      };

      mocks.cartItemRepository.findByCartId.mockResolvedValue([firstItem]);

      mocks.cartItemRepository.findByCartAndProduct.mockResolvedValue(
        undefined,
      );

      mocks.productRepository.findById.mockImplementation(
        async (id: string) => {
          if (id === "product-2") {
            return secondProduct;
          }

          return activeProduct;
        },
      );

      await cartService.addItem(sessionId, "product-2", 1);

      expect(mocks.cartItemRepository.create).toHaveBeenCalledWith({
        cart_id: cartId,
        product_id: "product-2",
        quantity: 1,
      });
    });

    // -------------------------------------------------------------------------
    // ADD ITEM EVENTS
    // -------------------------------------------------------------------------

    it("should create a cart.item_added event", async () => {
      setupActiveProduct();

      await cartService.addItem(sessionId, productId, 2);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "cart.item_added",
          session_id: sessionId,
          user_id: null,
          store_id: storeId,
          product_id: productId,
          metadata: expect.objectContaining({
            quantity: 2,
          }),
        }),
      );
    });

    it("should create the cart.item_added event with the cart id in the event key", async () => {
      setupActiveProduct();

      await cartService.addItem(sessionId, productId, 2);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_key: expect.stringContaining(`cart:${cartId}:`),
        }),
      );
    });

    it("should create the cart item and event inside the same transaction", async () => {
      setupActiveProduct();

      const executionOrder: string[] = [];

      mocks.cartItemRepository.create.mockImplementation(async () => {
        executionOrder.push("item");
        return cartItem;
      });

      mocks.eventRepository.create.mockImplementation(async () => {
        executionOrder.push("event");
        return { id: "event-1" };
      });

      await cartService.addItem(sessionId, productId, 2);

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
      expect(executionOrder).toEqual(["item", "event"]);
    });

    it("should not create the event when item creation fails", async () => {
      setupActiveProduct();

      mocks.cartItemRepository.create.mockRejectedValueOnce(
        new Error("item creation failed"),
      );

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toThrow("item creation failed");

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should propagate event creation errors", async () => {
      setupActiveProduct();

      mocks.eventRepository.create.mockRejectedValueOnce(
        new Error("event creation failed"),
      );

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toThrow("event creation failed");
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE QUANTITY
  // ---------------------------------------------------------------------------

  describe("updateItemQuantity", () => {
    it("should update an item quantity", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      const result = await cartService.updateItemQuantity(sessionId, itemId, 7);

      expect(result).toMatchObject({
        id: itemId,
        quantity: 5,
      });

      expect(mocks.cartItemRepository.updateQuantity).toHaveBeenCalledWith(
        itemId,
        {
          quantity: 7,
        },
      );
    });

    it("should reject a quantity equal to zero", async () => {
      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 0),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject a negative quantity", async () => {
      await expect(
        cartService.updateItemQuantity(sessionId, itemId, -2),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject a non-integer quantity", async () => {
      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 2.5),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject NaN as a quantity", async () => {
      await expect(
        cartService.updateItemQuantity(sessionId, itemId, Number.NaN),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject Infinity as a quantity", async () => {
      await expect(
        cartService.updateItemQuantity(sessionId, itemId, Infinity),
      ).rejects.toMatchObject({
        code: "INVALID_QUANTITY",
      });
    });

    it("should reject when the cart does not exist", async () => {
      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 2),
      ).rejects.toMatchObject({
        code: CartErrorCode.CART_NOT_FOUND,
      });
    });

    it("should reject when the item does not exist", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 2),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });
    });

    it("should reject an item belonging to another cart", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue({
        ...cartItem,
        cart_id: "another-cart",
      });

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 2),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });
    });

    // -------------------------------------------------------------------------
    // UPDATE EVENTS
    // -------------------------------------------------------------------------

    it("should create a cart.item_quantity_updated event", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue({
        ...cartItem,
        quantity: 3,
      });

      await cartService.updateItemQuantity(sessionId, itemId, 7);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "cart.item_quantity_updated",
          session_id: sessionId,
          user_id: null,
          store_id: storeId,
          product_id: productId,
          metadata: expect.objectContaining({
            from_quantity: 3,
            to_quantity: 7,
          }),
        }),
      );
    });

    it("should include the cart id in the quantity update event key", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      await cartService.updateItemQuantity(sessionId, itemId, 7);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_key: expect.stringContaining(`cart:${cartId}:`),
        }),
      );
    });

    it("should update the item and create the event inside the same transaction", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue({
        ...cartItem,
        quantity: 3,
      });

      const executionOrder: string[] = [];

      mocks.cartItemRepository.updateQuantity.mockImplementation(async () => {
        executionOrder.push("item");
        return {
          ...cartItem,
          quantity: 7,
        };
      });

      mocks.eventRepository.create.mockImplementation(async () => {
        executionOrder.push("event");
        return { id: "event-1" };
      });

      await cartService.updateItemQuantity(sessionId, itemId, 7);

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
      expect(executionOrder).toEqual(["item", "event"]);
    });

    it("should not create an event when quantity update fails", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      mocks.cartItemRepository.updateQuantity.mockRejectedValueOnce(
        new Error("update failed"),
      );

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 7),
      ).rejects.toThrow("update failed");

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should propagate event creation errors during quantity update", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      mocks.eventRepository.create.mockRejectedValueOnce(
        new Error("event creation failed"),
      );

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 7),
      ).rejects.toThrow("event creation failed");
    });
  });

  // ---------------------------------------------------------------------------
  // REMOVE ITEM
  // ---------------------------------------------------------------------------

  describe("removeItem", () => {
    it("should remove an item from the cart", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      await cartService.removeItem(sessionId, itemId);

      expect(mocks.cartItemRepository.delete).toHaveBeenCalledWith(itemId);
    });

    it("should reject when the cart does not exist", async () => {
      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(
        cartService.removeItem(sessionId, itemId),
      ).rejects.toMatchObject({
        code: CartErrorCode.CART_NOT_FOUND,
      });
    });

    it("should reject when the item does not exist", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.removeItem(sessionId, itemId),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });
    });

    it("should reject an item belonging to another cart", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue({
        ...cartItem,
        cart_id: "another-cart",
      });

      await expect(
        cartService.removeItem(sessionId, itemId),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });
    });

    // -------------------------------------------------------------------------
    // REMOVE EVENTS
    // -------------------------------------------------------------------------

    it("should create a cart.item_removed event", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      await cartService.removeItem(sessionId, itemId);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "cart.item_removed",
          session_id: sessionId,
          user_id: null,
          store_id: storeId,
          product_id: productId,
          metadata: expect.objectContaining({
            quantity: 2,
          }),
        }),
      );
    });

    it("should include the cart id in the removal event key", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      await cartService.removeItem(sessionId, itemId);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_key: expect.stringContaining(`cart:${cartId}:`),
        }),
      );
    });

    it("should delete the item and create the event inside the same transaction", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      const executionOrder: string[] = [];

      mocks.cartItemRepository.delete.mockImplementation(async () => {
        executionOrder.push("item");
        return 1;
      });

      mocks.eventRepository.create.mockImplementation(async () => {
        executionOrder.push("event");
        return { id: "event-1" };
      });

      await cartService.removeItem(sessionId, itemId);

      expect(mocks.database.transaction).toHaveBeenCalledTimes(1);
      expect(executionOrder).toEqual(["item", "event"]);
    });

    it("should not create an event when item deletion fails", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      mocks.cartItemRepository.delete.mockRejectedValueOnce(
        new Error("delete failed"),
      );

      await expect(cartService.removeItem(sessionId, itemId)).rejects.toThrow(
        "delete failed",
      );

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should propagate event creation errors during removal", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(cartItem);

      mocks.eventRepository.create.mockRejectedValueOnce(
        new Error("event creation failed"),
      );

      await expect(cartService.removeItem(sessionId, itemId)).rejects.toThrow(
        "event creation failed",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EVENT CONTEXT
  // ---------------------------------------------------------------------------

  describe("business event context", () => {
    it("should associate cart events with the buyer session", async () => {
      setupActiveProduct();

      await cartService.addItem("session-specific", productId, 1);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: "session-specific",
        }),
      );
    });

    it("should use null as user_id for anonymous cart actions", async () => {
      setupActiveProduct();

      await cartService.addItem(sessionId, productId, 1);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
        }),
      );
    });

    it("should associate add events with the product store", async () => {
      setupActiveProduct();

      await cartService.addItem(sessionId, productId, 1);

      expect(mocks.eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          store_id: storeId,
          product_id: productId,
        }),
      );
    });

    it("should not create any event when addItem validation fails", async () => {
      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.PRODUCT_NOT_FOUND,
      });

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should not create any event when the cart does not exist", async () => {
      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(
        cartService.addItem(sessionId, productId, 1),
      ).rejects.toMatchObject({
        code: CartErrorCode.CART_NOT_FOUND,
      });

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should not create any event when updating an invalid item", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.updateItemQuantity(sessionId, itemId, 4),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });

    it("should not create any event when removing an invalid item", async () => {
      mocks.cartItemRepository.findById.mockResolvedValue(undefined);

      await expect(
        cartService.removeItem(sessionId, itemId),
      ).rejects.toMatchObject({
        code: CartErrorCode.ITEM_NOT_FOUND,
      });

      expect(mocks.eventRepository.create).not.toHaveBeenCalled();
    });
  });
});
