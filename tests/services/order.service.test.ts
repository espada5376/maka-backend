import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

import { OrderService } from "../../src/services/order.service.js";
import { NotificationService } from "../../src/services/notification.service.js";

import {
  OrderRepository,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "../../src/database/repositories/order.repository.js";

import { SessionRepository } from "../../src/database/repositories/session.repository.js";
import { CartRepository } from "../../src/database/repositories/cart.repository.js";

import {
  CartItemRepository,
  type CartItemWithProductContext,
} from "../../src/database/repositories/cart-item.repository.js";

import { StoreRepository } from "../../src/database/repositories/store.repository.js";
import { ProductRepository } from "../../src/database/repositories/product.repository.js";
import { EventRepository } from "../../src/database/repositories/event.repository.js";

describe("OrderService", () => {
  const SESSION_ID = "11111111-1111-1111-1111-111111111111";

  const ORDER_ID = "99999999-9999-9999-9999-999999999999";

  const STORE_ID = "44444444-4444-4444-4444-444444444444";

  const PRODUCT_ID = "55555555-5555-5555-5555-555555555555";

  const PRODUCT_ID_2 = "66666666-6666-6666-6666-666666666666";

  const CART_ID = "77777777-7777-7777-7777-777777777777";

  const USER_ID = "88888888-8888-8888-8888-888888888888";
  const BUYER_USER_ID = "99999999-9999-9999-9999-999999999999";

  const CATEGORY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

  const validOrderInput = {
    idempotencyKey: "order-test-001",
    buyerPhone: "90123456",
    deliveryCountry: "TG",
    deliveryCity: "Lome",
    deliveryAddress: "Rue de test",
  };

  const validDirectOrderInput = {
    productId: PRODUCT_ID,
    quantity: 2,
    idempotencyKey: "direct-order-test-001",
    buyerPhone: "90123456",
    deliveryCountry: "TG",
    deliveryCity: "Lome",
    deliveryAddress: "Rue de test",
  };

  const mockDatabase = {
    transaction: vi.fn(),
  };

  const mockTransaction = {} as Knex;

  const mocks = {
    orderRepository: {
      findById: vi.fn(),
      findByReference: vi.fn(),
      findBySessionId: vi.fn(),
      findByBuyerUserId: vi.fn(),
      findByStoreId: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findItems: vi.fn(),
      create: vi.fn(),
      createItems: vi.fn(),
      createItem: vi.fn(),
      updateStatus: vi.fn(),
    },

    sessionRepository: {
      findById: vi.fn(),
    },

    cartRepository: {
      findBySessionId: vi.fn(),
    },

    cartItemRepository: {
      findByCartIdWithProductContext: vi.fn(),
    },

    storeRepository: {
      findById: vi.fn(),
    },

    productRepository: {
      findById: vi.fn(),
    },

    notificationService: {
      create: vi.fn(),
    },
  };

  let orderService: OrderService;

  let orderCreateSpy: ReturnType<typeof vi.spyOn>;
  let orderCreateItemsSpy: ReturnType<typeof vi.spyOn>;
  let orderCreateItemSpy: ReturnType<typeof vi.spyOn>;
  let eventCreateSpy: ReturnType<typeof vi.spyOn>;
  let cartDeleteByCartIdSpy: ReturnType<typeof vi.spyOn>;

  function createSession(overrides: Record<string, unknown> = {}) {
    return {
      id: SESSION_ID,
      user_id: null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
      ...overrides,
    };
  }

  function createCart(overrides: Record<string, unknown> = {}) {
    return {
      id: CART_ID,
      session_id: SESSION_ID,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  function createStore(overrides: Record<string, unknown> = {}) {
    return {
      id: STORE_ID,
      owner_id: USER_ID,
      name: "Ma Boutique",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  function createProduct(overrides: Record<string, unknown> = {}) {
    return {
      id: PRODUCT_ID,
      store_id: STORE_ID,
      category_id: CATEGORY_ID,
      name: "Produit Test",
      price: "10000.00",
      availability: "available",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  function createCartItem(
    overrides: Record<string, unknown> = {},
  ): CartItemWithProductContext {
    return {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      cart_id: CART_ID,
      product_id: PRODUCT_ID,
      quantity: 1,
      created_at: new Date(),
      updated_at: new Date(),

      product_name: "Produit Test",
      product_price: "10000.00",
      product_availability: "available",
      product_status: "active",
      product_store_id: STORE_ID,
      store_status: "active",

      ...overrides,
    } as CartItemWithProductContext;
  }

  function createOrder(overrides: Record<string, unknown> = {}): Order {
    return {
      id: ORDER_ID,
      reference: "ORD-20260101-A1B2C3",
      idempotency_key: "order-test-001",
      store_id: STORE_ID,
      buyer_user_id: null,
      session_id: SESSION_ID,
      status: "pending",
      total_amount: "10000.00",
      currency: "XOF",
      buyer_phone: "90123456",
      delivery_country: "TG",
      delivery_city: "Lome",
      delivery_address: "Rue de test",
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    } as Order;
  }

  function createOrderItem(overrides: Record<string, unknown> = {}): OrderItem {
    return {
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      order_id: ORDER_ID,
      product_id: PRODUCT_ID,
      product_name: "Produit Test",
      unit_price: "10000.00",
      quantity: 1,
      subtotal: "10000.00",
      created_at: new Date(),
      ...overrides,
    } as OrderItem;
  }

  function prepareValidCart(
    overrides: {
      session?: Record<string, unknown>;
      cart?: Record<string, unknown>;
      cartItem?: Record<string, unknown>;
      store?: Record<string, unknown>;
    } = {},
  ) {
    mocks.sessionRepository.findById.mockResolvedValue(
      createSession(overrides.session),
    );

    mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(undefined);

    mocks.cartRepository.findBySessionId.mockResolvedValue(
      createCart(overrides.cart),
    );

    mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue([
      createCartItem(overrides.cartItem),
    ]);

    mocks.storeRepository.findById.mockResolvedValue(
      createStore(overrides.store),
    );
  }

  function prepareValidDirectOrder(
    overrides: {
      session?: Record<string, unknown>;
      product?: Record<string, unknown>;
      store?: Record<string, unknown>;
    } = {},
  ) {
    mocks.sessionRepository.findById.mockResolvedValue(
      createSession(overrides.session),
    );

    mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(undefined);

    mocks.productRepository.findById.mockResolvedValue(
      createProduct(overrides.product),
    );

    mocks.storeRepository.findById.mockResolvedValue(
      createStore(overrides.store),
    );
  }

  function prepareOrderState(status: OrderStatus) {
    const order = createOrder({
      status,
    });

    mocks.orderRepository.findById.mockImplementation(async () => order);

    mocks.orderRepository.updateStatus.mockImplementation(
      async (id: string, newStatus: OrderStatus) => {
        order.status = newStatus;

        return order;
      },
    );

    return order;
  }

  beforeEach(() => {
    vi.restoreAllMocks();

    Object.values(mocks.orderRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.sessionRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.cartRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.cartItemRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.storeRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.productRepository).forEach((mock) => mock.mockReset());

    Object.values(mocks.notificationService).forEach((mock) =>
      mock.mockReset(),
    );

    mocks.notificationService.create.mockResolvedValue({
      id: "notification-1",
      user_id: USER_ID,
      type: "new_order_for_seller",
      title: "Nouvelle commande",
      body: "Vous avez reçu une nouvelle commande.",
      data: {},
      read_at: null,
      created_at: new Date(),
    });

    mockDatabase.transaction.mockReset();

    mockDatabase.transaction.mockImplementation(
      async (callback: (trx: Knex) => Promise<unknown>) => {
        return callback(mockTransaction);
      },
    );

    mocks.orderRepository.findItems.mockResolvedValue([]);

    mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(undefined);

    orderCreateSpy = vi
      .spyOn(OrderRepository.prototype, "create")
      .mockResolvedValue(createOrder());

    orderCreateItemsSpy = vi
      .spyOn(OrderRepository.prototype, "createItems")
      .mockResolvedValue([]);

    orderCreateItemSpy = vi
      .spyOn(OrderRepository.prototype, "createItem")
      .mockResolvedValue(createOrderItem());

    eventCreateSpy = vi
      .spyOn(EventRepository.prototype, "create")
      .mockResolvedValue(undefined as never);

    cartDeleteByCartIdSpy = vi
      .spyOn(CartItemRepository.prototype, "deleteByCartId")
      .mockResolvedValue(1);

    orderService = new OrderService(
      mockDatabase as unknown as Knex,
      mocks.orderRepository as unknown as OrderRepository,
      mocks.sessionRepository as unknown as SessionRepository,
      mocks.cartRepository as unknown as CartRepository,
      mocks.cartItemRepository as unknown as CartItemRepository,
      mocks.storeRepository as unknown as StoreRepository,
      mocks.productRepository as unknown as ProductRepository,
      mocks.notificationService as unknown as NotificationService,
    );
  });
  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------

  describe("getById", () => {
    it("should return the order with its items", async () => {
      const order = createOrder();
      const items = [createOrderItem()];

      mocks.orderRepository.findById.mockResolvedValue(order);

      mocks.orderRepository.findItems.mockResolvedValue(items);

      const result = await orderService.getById(ORDER_ID);

      expect(result).toEqual({
        ...order,
        items,
      });

      expect(mocks.orderRepository.findById).toHaveBeenCalledWith(ORDER_ID);

      expect(mocks.orderRepository.findItems).toHaveBeenCalledWith(ORDER_ID);
    });

    it("should reject a nonexistent order", async () => {
      mocks.orderRepository.findById.mockResolvedValue(undefined);

      await expect(orderService.getById(ORDER_ID)).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GET BY REFERENCE
  // ---------------------------------------------------------------------------

  describe("getByReference", () => {
    it("should return the order with its items", async () => {
      const order = createOrder();
      const items = [createOrderItem()];

      mocks.orderRepository.findByReference.mockResolvedValue(order);

      mocks.orderRepository.findItems.mockResolvedValue(items);

      const result = await orderService.getByReference(order.reference);

      expect(result).toEqual({
        ...order,
        items,
      });

      expect(mocks.orderRepository.findByReference).toHaveBeenCalledWith(
        order.reference,
      );

      expect(mocks.orderRepository.findItems).toHaveBeenCalledWith(ORDER_ID);
    });

    it("should reject a nonexistent order", async () => {
      mocks.orderRepository.findByReference.mockResolvedValue(undefined);

      await expect(
        orderService.getByReference("ORD-20260101-A1B2C3"),
      ).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // GET FOR SESSION
  // ---------------------------------------------------------------------------

  describe("getForSession", () => {
    it("should return all session orders with their items", async () => {
      const firstOrder = createOrder({
        id: ORDER_ID,
      });

      const secondOrder = createOrder({
        id: "aaaaaaaa-1111-1111-1111-111111111111",
      });

      const firstItems = [
        createOrderItem({
          order_id: firstOrder.id,
        }),
      ];

      const secondItems = [
        createOrderItem({
          order_id: secondOrder.id,
        }),
      ];

      mocks.orderRepository.findBySessionId.mockResolvedValue([
        firstOrder,
        secondOrder,
      ]);

      mocks.orderRepository.findItems
        .mockResolvedValueOnce(firstItems)
        .mockResolvedValueOnce(secondItems);

      const result = await orderService.getForSession(SESSION_ID);

      expect(result).toEqual([
        {
          ...firstOrder,
          items: firstItems,
        },
        {
          ...secondOrder,
          items: secondItems,
        },
      ]);

      expect(mocks.orderRepository.findBySessionId).toHaveBeenCalledWith(
        SESSION_ID,
      );

      expect(mocks.orderRepository.findItems).toHaveBeenCalledTimes(2);

      expect(mocks.orderRepository.findItems).toHaveBeenNthCalledWith(
        1,
        firstOrder.id,
      );

      expect(mocks.orderRepository.findItems).toHaveBeenNthCalledWith(
        2,
        secondOrder.id,
      );
    });

    it("should return an empty array when the session has no orders", async () => {
      mocks.orderRepository.findBySessionId.mockResolvedValue([]);

      const result = await orderService.getForSession(SESSION_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET FOR BUYER
  // ---------------------------------------------------------------------------

  describe("getForBuyer", () => {
    it("should return all buyer orders with their items", async () => {
      const order = createOrder({
        buyer_user_id: USER_ID,
      });

      const item = createOrderItem();

      mocks.orderRepository.findByBuyerUserId.mockResolvedValue([order]);

      mocks.orderRepository.findItems.mockResolvedValue([item]);

      const result = await orderService.getForBuyer(USER_ID);

      expect(result).toEqual([
        {
          ...order,
          items: [item],
        },
      ]);

      expect(mocks.orderRepository.findByBuyerUserId).toHaveBeenCalledWith(
        USER_ID,
      );

      expect(mocks.orderRepository.findItems).toHaveBeenCalledWith(order.id);
    });

    it("should return an empty array when the buyer has no orders", async () => {
      mocks.orderRepository.findByBuyerUserId.mockResolvedValue([]);

      const result = await orderService.getForBuyer(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // GET FOR STORE
  // ---------------------------------------------------------------------------

  describe("getForStore", () => {
    it("should return all store orders with their items", async () => {
      const order = createOrder();

      const item = createOrderItem();

      mocks.orderRepository.findByStoreId.mockResolvedValue([order]);

      mocks.orderRepository.findItems.mockResolvedValue([item]);

      const result = await orderService.getForStore(STORE_ID);

      expect(result).toEqual([
        {
          ...order,
          items: [item],
        },
      ]);

      expect(mocks.orderRepository.findByStoreId).toHaveBeenCalledWith(
        STORE_ID,
      );

      expect(mocks.orderRepository.findItems).toHaveBeenCalledWith(order.id);
    });

    it("should return an empty array when the store has no orders", async () => {
      mocks.orderRepository.findByStoreId.mockResolvedValue([]);

      const result = await orderService.getForStore(STORE_ID);

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE FROM CART
  // ---------------------------------------------------------------------------

  describe("createFromCart", () => {
    it("should create an order from a valid cart", async () => {
      prepareValidCart();

      const product = createCartItem({
        product_name: "Perruque Premium",
        product_price: "15000.00",
        quantity: 2,
      });

      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [product],
      );

      const createdOrder = createOrder({
        total_amount: "30000.00",
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      orderCreateItemsSpy.mockResolvedValue([]);

      mocks.orderRepository.findItems.mockResolvedValue([]);

      const result = await orderService.createFromCart(
        SESSION_ID,
        validOrderInput,
      );

      expect(result).toEqual({
        ...createdOrder,
        items: [],
      });

      expect(mockDatabase.transaction).toHaveBeenCalledTimes(1);

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: expect.stringMatching(/^ORD-\d{8}-[A-F0-9]{6}$/),
          idempotency_key: validOrderInput.idempotencyKey,
          store_id: STORE_ID,
          buyer_user_id: null,
          session_id: SESSION_ID,
          status: "pending",
          total_amount: 30000,
          currency: "XOF",
          buyer_phone: validOrderInput.buyerPhone,
          delivery_country: validOrderInput.deliveryCountry,
          delivery_city: validOrderInput.deliveryCity,
          delivery_address: validOrderInput.deliveryAddress,
        }),
      );
    });

    it("should use the authenticated user from the session as buyer_user_id", async () => {
      prepareValidCart({
        session: {
          user_id: USER_ID,
        },
      });

      const createdOrder = createOrder({
        buyer_user_id: USER_ID,
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-user-session-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          buyer_user_id: USER_ID,
        }),
      );
    });

    it("should reject a nonexistent session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.createFromCart(SESSION_ID, validOrderInput),
      ).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });
    });

    it("should reject an expired session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(
        createSession({
          expires_at: new Date(Date.now() - 1000),
        }),
      );

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-expired-001",
        }),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });

    it("should reject when the cart does not exist", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.cartRepository.findBySessionId.mockResolvedValue(undefined);

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-no-cart-001",
        }),
      ).rejects.toMatchObject({
        code: "CART_NOT_FOUND",
      });
    });

    it("should reject an empty cart", async () => {
      prepareValidCart();

      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [],
      );

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-empty-cart-001",
        }),
      ).rejects.toMatchObject({
        code: "CART_EMPTY",
      });
    });

    it("should reject an unavailable product", async () => {
      prepareValidCart({
        cartItem: {
          product_availability: "unavailable",
        },
      });

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-unavailable-001",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_UNAVAILABLE",
      });
    });

    it("should reject an archived product", async () => {
      prepareValidCart({
        cartItem: {
          product_status: "archived",
        },
      });

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-archived-001",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_INACTIVE",
      });
    });

    it("should reject a product from an inactive store", async () => {
      prepareValidCart({
        store: {
          status: "inactive",
        },
        cartItem: {
          store_status: "inactive",
        },
      });

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-inactive-store-001",
        }),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject cart items belonging to multiple stores", async () => {
      prepareValidCart();

      const firstItem = createCartItem({
        product_store_id: STORE_ID,
      });

      const secondItem = createCartItem({
        id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        product_id: PRODUCT_ID_2,
        product_store_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      });

      mocks.cartItemRepository.findByCartIdWithProductContext.mockResolvedValue(
        [firstItem, secondItem],
      );

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-multiple-stores-001",
        }),
      ).rejects.toMatchObject({
        code: "MULTIPLE_STORES_IN_CART",
      });
    });

    it("should reject a cart item with an invalid quantity", async () => {
      prepareValidCart({
        cartItem: {
          quantity: 0,
        },
      });

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-invalid-quantity-001",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CART_ITEM_QUANTITY",
      });
    });

    it("should reject when the store does not exist", async () => {
      prepareValidCart();

      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-no-store-001",
        }),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should reject a store with a non-XOF currency", async () => {
      prepareValidCart({
        store: {
          currency: "EUR",
        },
      });

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "order-currency-001",
        }),
      ).rejects.toMatchObject({
        code: "CURRENCY_MISMATCH",
      });
    });

    it("should calculate the total from server-side product prices", async () => {
      prepareValidCart({
        cartItem: {
          product_price: "15000.00",
          quantity: 2,
        },
      });

      const createdOrder = createOrder({
        total_amount: "30000.00",
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-server-total-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 30000,
        }),
      );
    });

    it("should create order items from the cart items", async () => {
      prepareValidCart({
        cartItem: {
          product_name: "Perruque Premium",
          product_price: "15000.00",
          quantity: 2,
        },
      });

      const createdOrder = createOrder({
        total_amount: "30000.00",
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-items-001",
      });

      expect(orderCreateItemsSpy).toHaveBeenCalledWith([
        {
          order_id: ORDER_ID,
          product_id: PRODUCT_ID,
          product_name: "Perruque Premium",
          unit_price: 15000,
          quantity: 2,
          subtotal: 30000,
        },
      ]);
    });

    it("should create the order with pending status", async () => {
      prepareValidCart();

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-pending-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
        }),
      );
    });

    it("should empty the cart after successful order creation", async () => {
      prepareValidCart();

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-empty-after-001",
      });

      expect(cartDeleteByCartIdSpy).toHaveBeenCalledWith(CART_ID);
    });

    it("should create the order.created event with cart source", async () => {
      prepareValidCart();

      const createdOrder = createOrder({
        total_amount: "10000.00",
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "order-event-cart-001",
      });

      expect(eventCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "order.created",
          event_key: `order:${ORDER_ID}:created`,
          session_id: SESSION_ID,
          user_id: null,
          store_id: STORE_ID,
          order_id: ORDER_ID,
          metadata: expect.objectContaining({
            source: "cart",
            item_count: 1,
            total_amount: 10000,
            currency: "XOF",
          }),
        }),
      );
    });

    it("should notify the seller only when the cart buyer is anonymous", async () => {
      prepareValidCart({
        session: {
          user_id: null,
        },
      });

      const createdOrder = createOrder({
        buyer_user_id: null,
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      orderCreateItemsSpy.mockResolvedValue([createOrderItem()]);

      await orderService.createFromCart(SESSION_ID, validOrderInput);

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 10000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );
    });

    it("should notify both seller and buyer when the cart buyer is authenticated", async () => {
      prepareValidCart({
        session: {
          user_id: BUYER_USER_ID,
        },
      });

      const createdOrder = createOrder({
        buyer_user_id: BUYER_USER_ID,
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      orderCreateItemsSpy.mockResolvedValue([createOrderItem()]);

      await orderService.createFromCart(SESSION_ID, validOrderInput);

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(2);

      expect(mocks.notificationService.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 10000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );

      expect(mocks.notificationService.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          user_id: BUYER_USER_ID,
          type: "new_order_for_buyer",
          title: "Commande créée",
          body: `Votre commande ${createdOrder.reference} a été créée.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 10000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE DIRECT
  // ---------------------------------------------------------------------------

  describe("createDirect", () => {
    it("should create an order directly from a valid product", async () => {
      prepareValidDirectOrder();

      const createdOrder = createOrder({
        total_amount: "20000.00",
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      const result = await orderService.createDirect(
        SESSION_ID,
        validDirectOrderInput,
      );

      expect(result).toEqual({
        ...createdOrder,
        items: expect.any(Array),
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          store_id: STORE_ID,
          session_id: SESSION_ID,
          buyer_user_id: null,
          total_amount: 20000,
          currency: "XOF",
        }),
      );
    });

    it("should use the authenticated user from the session as buyer_user_id", async () => {
      prepareValidDirectOrder({
        session: {
          user_id: USER_ID,
        },
      });

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        idempotencyKey: "direct-user-session-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          buyer_user_id: USER_ID,
        }),
      );
    });

    it("should reject a nonexistent session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
      });
    });

    it("should reject an expired session", async () => {
      prepareValidDirectOrder({
        session: {
          expires_at: new Date(Date.now() - 1000),
        },
      });

      await expect(
        orderService.createDirect(SESSION_ID, {
          ...validDirectOrderInput,
          idempotencyKey: "direct-expired-001",
        }),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });

    it("should reject a reused idempotency key from another session", async () => {
      prepareValidDirectOrder();

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        createOrder({
          session_id: "99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        }),
      );

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_KEY_CONFLICT",
      });
    });

    it("should return the existing order for an idempotent retry in the same session", async () => {
      const existingOrder = createOrder({
        total_amount: "20000.00",
      });

      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        existingOrder,
      );

      mocks.orderRepository.findItems.mockResolvedValue([]);

      const result = await orderService.createDirect(
        SESSION_ID,
        validDirectOrderInput,
      );

      expect(result).toEqual({
        ...existingOrder,
        items: [],
      });

      expect(orderCreateSpy).not.toHaveBeenCalled();
    });

    it("should reject a quantity equal to zero", async () => {
      prepareValidDirectOrder();

      await expect(
        orderService.createDirect(SESSION_ID, {
          ...validDirectOrderInput,
          quantity: 0,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CART_ITEM_QUANTITY",
      });
    });

    it("should reject a negative quantity", async () => {
      prepareValidDirectOrder();

      await expect(
        orderService.createDirect(SESSION_ID, {
          ...validDirectOrderInput,
          quantity: -1,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CART_ITEM_QUANTITY",
      });
    });

    it("should reject a nonexistent product", async () => {
      prepareValidDirectOrder();

      mocks.productRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject an archived product", async () => {
      prepareValidDirectOrder({
        product: {
          status: "archived",
        },
      });

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_INACTIVE",
      });
    });

    it("should reject an unavailable product", async () => {
      prepareValidDirectOrder({
        product: {
          availability: "unavailable",
        },
      });

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "PRODUCT_UNAVAILABLE",
      });
    });

    it("should reject a nonexistent store", async () => {
      prepareValidDirectOrder();

      mocks.storeRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "STORE_NOT_FOUND",
      });
    });

    it("should reject a product from an inactive store", async () => {
      prepareValidDirectOrder({
        store: {
          status: "inactive",
        },
      });

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject a store with a non-XOF currency", async () => {
      prepareValidDirectOrder({
        store: {
          currency: "EUR",
        },
      });

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "CURRENCY_MISMATCH",
      });
    });

    it("should calculate the total from the server-side product price", async () => {
      prepareValidDirectOrder({
        product: {
          price: "15000.00",
        },
      });

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        quantity: 2,
        idempotencyKey: "direct-server-total-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          total_amount: 30000,
        }),
      );
    });

    it("should snapshot the current product name and price", async () => {
      prepareValidDirectOrder({
        product: {
          name: "Perruque Premium",
          price: "15000.00",
        },
      });

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        quantity: 2,
        idempotencyKey: "direct-snapshot-001",
      });

      expect(orderCreateItemSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: PRODUCT_ID,
          product_name: "Perruque Premium",
          unit_price: 15000,
          quantity: 2,
          subtotal: 30000,
        }),
      );
    });

    it("should create exactly one order item", async () => {
      prepareValidDirectOrder();

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        quantity: 5,
        idempotencyKey: "direct-one-item-001",
      });

      expect(orderCreateItemSpy).toHaveBeenCalledTimes(1);

      expect(orderCreateItemSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: PRODUCT_ID,
          quantity: 5,
        }),
      );
    });

    it("should create the order with pending status", async () => {
      prepareValidDirectOrder();

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        idempotencyKey: "direct-pending-001",
      });

      expect(orderCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
        }),
      );
    });

    it("should create an order.created event with product source", async () => {
      prepareValidDirectOrder();

      await orderService.createDirect(SESSION_ID, {
        ...validDirectOrderInput,
        quantity: 2,
        idempotencyKey: "direct-event-001",
      });

      expect(eventCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_name: "order.created",
          event_key: `order:${ORDER_ID}:created`,
          session_id: SESSION_ID,
          user_id: null,
          store_id: STORE_ID,
          product_id: PRODUCT_ID,
          order_id: ORDER_ID,
          metadata: expect.objectContaining({
            source: "product",
            item_count: 1,
            total_amount: 20000,
            currency: "XOF",
          }),
        }),
      );
    });

    it("should notify the seller only when the buyer is anonymous", async () => {
      prepareValidDirectOrder({
        session: {
          user_id: null,
        },
      });

      const createdOrderItem = createOrderItem();

      const createdOrder = createOrder({
        buyer_user_id: null,
      });

      orderCreateSpy.mockResolvedValue(createdOrder);
      orderCreateItemSpy.mockResolvedValue(createdOrderItem);

      orderCreateItemSpy.mockResolvedValue(createOrderItem());

      const result = await orderService.createDirect(
        SESSION_ID,
        validDirectOrderInput,
      );

      expect(result).toEqual({
        ...createdOrder,
        items: [createdOrderItem],
      });

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 20000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );
    });

    it("should notify both seller and buyer when the buyer is authenticated", async () => {
      prepareValidDirectOrder({
        session: {
          user_id: USER_ID,
        },
      });

      const createdOrder = createOrder({
        buyer_user_id: USER_ID,
      });

      orderCreateSpy.mockResolvedValue(createdOrder);

      orderCreateItemSpy.mockResolvedValue(createOrderItem());

      await orderService.createDirect(SESSION_ID, validDirectOrderInput);

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(2);

      expect(mocks.notificationService.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 20000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );

      expect(mocks.notificationService.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_buyer",
          title: "Commande créée",
          body: `Votre commande ${createdOrder.reference} a été créée.`,
          data: expect.objectContaining({
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: 20000,
            currency: "XOF",
          }),
        }),
        mockTransaction,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // IDEMPOTENCE
  // ---------------------------------------------------------------------------

  describe("idempotence", () => {
    it("should return the existing cart order when the same key is reused in the same session", async () => {
      const existingOrder = createOrder({
        total_amount: "10000.00",
      });

      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        existingOrder,
      );

      mocks.orderRepository.findItems.mockResolvedValue([]);

      const result = await orderService.createFromCart(SESSION_ID, {
        ...validOrderInput,
        idempotencyKey: "cart-idempotence-same-session",
      });

      expect(result).toEqual({
        ...existingOrder,
        items: [],
      });

      expect(orderCreateSpy).not.toHaveBeenCalled();
    });

    it("should reject reuse of a cart idempotency key from another session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        createOrder({
          session_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        }),
      );

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "cart-idempotence-cross-session",
        }),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_KEY_CONFLICT",
      });
    });

    it("should return the existing direct order when the same key is reused in the same session", async () => {
      const existingOrder = createOrder({
        total_amount: "20000.00",
      });

      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        existingOrder,
      );

      mocks.orderRepository.findItems.mockResolvedValue([]);

      const result = await orderService.createDirect(
        SESSION_ID,
        validDirectOrderInput,
      );

      expect(result).toEqual({
        ...existingOrder,
        items: [],
      });

      expect(orderCreateSpy).not.toHaveBeenCalled();
    });

    it("should reject reuse of a direct idempotency key from another session", async () => {
      mocks.sessionRepository.findById.mockResolvedValue(createSession());

      mocks.orderRepository.findByIdempotencyKey.mockResolvedValue(
        createOrder({
          session_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        }),
      );

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_KEY_CONFLICT",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // TRANSACTION
  // ---------------------------------------------------------------------------

  describe("transaction", () => {
    it("should rollback the cart order when creating order items fails", async () => {
      prepareValidCart();

      orderCreateItemsSpy.mockRejectedValueOnce(
        new Error("Simulated order item failure"),
      );

      await expect(
        orderService.createFromCart(SESSION_ID, {
          ...validOrderInput,
          idempotencyKey: "transaction-rollback",
        }),
      ).rejects.toThrow("Simulated order item failure");

      expect(cartDeleteByCartIdSpy).not.toHaveBeenCalled();
    });

    it("should rollback the direct order when creating the order item fails", async () => {
      prepareValidDirectOrder();

      orderCreateItemSpy.mockRejectedValueOnce(
        new Error("Simulated direct order item failure"),
      );

      await expect(
        orderService.createDirect(SESSION_ID, {
          ...validDirectOrderInput,
          idempotencyKey: "direct-transaction-rollback",
        }),
      ).rejects.toThrow("Simulated direct order item failure");

      expect(eventCreateSpy).not.toHaveBeenCalled();
    });

    it("should rollback the direct order when seller notification creation fails", async () => {
      prepareValidDirectOrder();

      const notificationError = new Error(
        "Seller notification creation failed",
      );

      mocks.notificationService.create.mockRejectedValue(notificationError);

      await expect(
        orderService.createDirect(SESSION_ID, validDirectOrderInput),
      ).rejects.toThrow(notificationError);

      expect(mockDatabase.transaction).toHaveBeenCalledTimes(1);

      expect(orderCreateSpy).toHaveBeenCalledTimes(1);
      expect(orderCreateItemSpy).toHaveBeenCalledTimes(1);
      expect(eventCreateSpy).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
        }),
        mockTransaction,
      );
    });

    it("should rollback the cart order when seller notification creation fails", async () => {
      prepareValidCart();

      const notificationError = new Error(
        "Seller notification creation failed",
      );

      mocks.notificationService.create.mockRejectedValue(notificationError);

      await expect(
        orderService.createFromCart(SESSION_ID, validOrderInput),
      ).rejects.toThrow(notificationError);

      expect(mockDatabase.transaction).toHaveBeenCalledTimes(1);

      expect(orderCreateSpy).toHaveBeenCalledTimes(1);
      expect(orderCreateItemsSpy).toHaveBeenCalledTimes(1);
      expect(eventCreateSpy).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledTimes(1);

      expect(mocks.notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          type: "new_order_for_seller",
        }),
        mockTransaction,
      );

      expect(cartDeleteByCartIdSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ORDER STATE MACHINE
  // ---------------------------------------------------------------------------

  describe("order state machine", () => {
    it("should allow the complete valid order lifecycle", async () => {
      const order = prepareOrderState("pending");

      await orderService.updateStatus(ORDER_ID, "confirmed");

      expect(order.status).toBe("confirmed");

      await orderService.updateStatus(ORDER_ID, "preparing");

      expect(order.status).toBe("preparing");

      await orderService.updateStatus(ORDER_ID, "ready");

      expect(order.status).toBe("ready");

      await orderService.updateStatus(ORDER_ID, "delivering");

      expect(order.status).toBe("delivering");

      const delivered = await orderService.updateStatus(ORDER_ID, "delivered");

      expect(delivered.status).toBe("delivered");
    });

    it("should allow cancellation from pending", async () => {
      const order = prepareOrderState("pending");

      const result = await orderService.updateStatus(ORDER_ID, "cancelled");

      expect(result.status).toBe("cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should allow cancellation from confirmed", async () => {
      const order = prepareOrderState("confirmed");

      const result = await orderService.updateStatus(ORDER_ID, "cancelled");

      expect(result.status).toBe("cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should allow cancellation from preparing", async () => {
      const order = prepareOrderState("preparing");

      const result = await orderService.updateStatus(ORDER_ID, "cancelled");

      expect(result.status).toBe("cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should reject cancellation from ready", async () => {
      prepareOrderState("ready");

      await expect(
        orderService.updateStatus(ORDER_ID, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject cancellation from delivering", async () => {
      prepareOrderState("delivering");

      await expect(
        orderService.updateStatus(ORDER_ID, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject any transition from delivered", async () => {
      prepareOrderState("delivered");

      await expect(
        orderService.updateStatus(ORDER_ID, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(ORDER_ID, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject any transition from cancelled", async () => {
      prepareOrderState("cancelled");

      await expect(
        orderService.updateStatus(ORDER_ID, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(ORDER_ID, "preparing"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(ORDER_ID, "delivering"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject backward transitions", async () => {
      prepareOrderState("ready");

      await expect(
        orderService.updateStatus(ORDER_ID, "preparing"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(ORDER_ID, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(ORDER_ID, "pending"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should accept the same status as an idempotent transition", async () => {
      const order = prepareOrderState("pending");

      const first = await orderService.updateStatus(ORDER_ID, "pending");

      expect(first.status).toBe("pending");

      const second = await orderService.updateStatus(ORDER_ID, "pending");

      expect(second.status).toBe("pending");

      expect(second.id).toBe(first.id);

      expect(order.status).toBe("pending");
    });

    it("should reject updating a nonexistent order", async () => {
      mocks.orderRepository.findById.mockResolvedValue(undefined);

      await expect(
        orderService.updateStatus(ORDER_ID, "confirmed"),
      ).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });

    it("should reject when the repository cannot update the order", async () => {
      prepareOrderState("pending");

      mocks.orderRepository.updateStatus.mockResolvedValue(undefined);

      await expect(
        orderService.updateStatus(ORDER_ID, "confirmed"),
      ).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });
  });
});
