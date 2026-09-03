import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import db from "../../src/database/knex";

import { OrderService } from "../../src/services/order.service";

import { OrderRepository } from "../../src/database/repositories/order.repository";

import { UserRepository } from "../../src/database/repositories/user.repository";

import { StoreRepository } from "../../src/database/repositories/store.repository";

import { CategoryRepository } from "../../src/database/repositories/category.repository";

import { EventRepository } from "../../src/database/repositories/event.repository";

import { ProductRepository } from "../../src/database/repositories/product.repository";

import { CartRepository } from "../../src/database/repositories/cart.repository";

import { CartItemRepository } from "../../src/database/repositories/cart-item.repository";

import { cleanDatabase } from "../helpers/database";

describe("OrderService", () => {
  const orderService = new OrderService(db);

  const orderRepository = new OrderRepository(db);
  const userRepository = new UserRepository(db);
  const storeRepository = new StoreRepository(db);
  const categoryRepository = new CategoryRepository(db);
  const productRepository = new ProductRepository(db);
  const cartRepository = new CartRepository(db);
  const cartItemRepository = new CartItemRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ---------------------------------------------------------------------------
  // TEST HELPERS
  // ---------------------------------------------------------------------------

  async function createAnonymousSession(
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000),
  ) {
    const [session] = await db("sessions")
      .insert({
        user_id: null,
        expires_at: expiresAt,
      })
      .returning("*");

    return session;
  }

  async function createUser(name = "Test User") {
    return userRepository.create({
      phone: `9${Date.now()}${Math.floor(Math.random() * 1000)}`,
      name,
    });
  }

  async function createStore(ownerId: string, name = "Ma Boutique") {
    return storeRepository.create({
      owner_id: ownerId,
      name,
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });
  }

  async function createCategory() {
    return categoryRepository.create({
      name: "Beauté",
      slug: `beaute-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    });
  }

  async function createProduct(
    storeId: string,
    categoryId: string,
    options: {
      name?: string;
      price?: number;
      availability?: "available" | "unavailable";
      status?: "active" | "archived";
    } = {},
  ) {
    return productRepository.create({
      store_id: storeId,
      category_id: categoryId,
      name: options.name ?? "Produit Test",
      price: options.price ?? 10000,
      availability: options.availability ?? "available",
      status: options.status ?? "active",
    });
  }

  async function createCartContext() {
    const session = await createAnonymousSession();

    const user = await createUser("Store Owner");

    const store = await createStore(user.id);

    const category = await createCategory();

    const cart = await cartRepository.create({
      session_id: session.id,
    });

    return {
      session,
      user,
      store,
      category,
      cart,
    };
  }

  async function createDirectContext() {
    const session = await createAnonymousSession();

    const user = await createUser("Store Owner");

    const store = await createStore(user.id);

    const category = await createCategory();

    const product = await createProduct(store.id, category.id);

    return {
      session,
      user,
      store,
      category,
      product,
    };
  }

  async function addCartItem(
    sessionId: string,
    cartId: string,
    productId: string,
    quantity = 1,
  ) {
    // sessionId est conservé dans la signature
    // pour garder les helpers cohérents avec les tests.
    void sessionId;

    return cartItemRepository.create({
      cart_id: cartId,
      product_id: productId,
      quantity,
    });
  }

  const validOrderInput = {
    idempotencyKey: "order-test-001",
    buyerPhone: "90123456",
    deliveryCountry: "TG",
    deliveryCity: "Lome",
    deliveryAddress: "Rue de test",
  };

  const validDirectOrderInput = {
    productId: "",
    quantity: 2,
    idempotencyKey: "direct-order-test-001",
    buyerPhone: "90123456",
    deliveryCountry: "TG",
    deliveryCity: "Lome",
    deliveryAddress: "Rue de test",
  };

  async function createPendingOrder(service: OrderService): Promise<{
    orderId: string;
    sessionId: string;
  }> {
    const context = await createCartContext();

    const product = await createProduct(context.store.id, context.category.id, {
      name: "Produit état",
      price: 10000,
    });

    await addCartItem(context.session.id, context.cart.id, product.id, 1);

    const order = await service.createFromCart(context.session.id, {
      ...validOrderInput,
      idempotencyKey: `state-${Date.now()}-${Math.random()}`,
    });

    return {
      orderId: order.id,
      sessionId: context.session.id,
    };
  }

  // ---------------------------------------------------------------------------
  // CREATE FROM CART
  // ---------------------------------------------------------------------------

  it("should create an order from a valid cart", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      name: "Perruque Premium",
      price: 15000,
    });

    await addCartItem(session.id, cart.id, product.id, 2);

    const order = await orderService.createFromCart(
      session.id,
      validOrderInput,
    );

    expect(order).toBeDefined();
    expect(order.id).toBeDefined();

    expect(order.reference).toMatch(/^ORD-\d{8}-[A-F0-9]{6}$/);

    expect(order.store_id).toBe(store.id);

    expect(order.session_id).toBe(session.id);

    expect(order.buyer_user_id).toBeNull();

    expect(order.status).toBe("pending");

    expect(order.currency).toBe("XOF");

    expect(order.buyer_phone).toBe(validOrderInput.buyerPhone);

    expect(order.delivery_country).toBe(validOrderInput.deliveryCountry);

    expect(order.delivery_city).toBe(validOrderInput.deliveryCity);

    expect(order.delivery_address).toBe(validOrderInput.deliveryAddress);

    expect(order.total_amount).toBe("30000.00");

    expect(order.items).toHaveLength(1);

    expect(order.items[0]).toMatchObject({
      product_id: product.id,
      product_name: "Perruque Premium",
      unit_price: "15000.00",
      quantity: 2,
      subtotal: "30000.00",
    });
  });

  it("should use the authenticated user from the session as buyer_user_id", async () => {
    const session = await createAnonymousSession();

    const user = await createUser("Buyer");

    await db("sessions").where({ id: session.id }).update({
      user_id: user.id,
    });

    const store = await createStore(user.id);

    const category = await createCategory();

    const cart = await cartRepository.create({
      session_id: session.id,
    });

    const product = await createProduct(store.id, category.id);

    await addCartItem(session.id, cart.id, product.id, 1);

    const order = await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-user-session-001",
    });

    expect(order.buyer_user_id).toBe(user.id);
  });

  it("should reject a nonexistent session", async () => {
    const fakeSessionId = "00000000-0000-0000-0000-000000000000";

    await expect(
      orderService.createFromCart(fakeSessionId, validOrderInput),
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  it("should reject an expired session", async () => {
    const session = await createAnonymousSession(new Date(Date.now() - 1000));

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-expired-001",
      }),
    ).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });

  it("should reject when the cart does not exist", async () => {
    const session = await createAnonymousSession();

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-no-cart-001",
      }),
    ).rejects.toMatchObject({
      code: "CART_NOT_FOUND",
    });
  });

  it("should reject an empty cart", async () => {
    const { session } = await createCartContext();

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-empty-cart-001",
      }),
    ).rejects.toMatchObject({
      code: "CART_EMPTY",
    });
  });

  it("should reject an unavailable product", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      availability: "unavailable",
    });

    await addCartItem(session.id, cart.id, product.id, 1);

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-unavailable-001",
      }),
    ).rejects.toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
    });
  });

  it("should reject an archived product", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      status: "archived",
    });

    await addCartItem(session.id, cart.id, product.id, 1);

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-archived-001",
      }),
    ).rejects.toMatchObject({
      code: "PRODUCT_INACTIVE",
    });
  });

  it("should reject a product from an inactive store", async () => {
    const { session, store, category, cart } = await createCartContext();

    await storeRepository.setStatus(store.id, "inactive");

    const product = await createProduct(store.id, category.id);

    await addCartItem(session.id, cart.id, product.id, 1);

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-inactive-store-001",
      }),
    ).rejects.toMatchObject({
      code: "STORE_INACTIVE",
    });
  });

  it("should reject cart items belonging to multiple stores", async () => {
    const { session, store, category, cart } = await createCartContext();

    const secondUser = await createUser("Second Owner");

    const secondStore = await createStore(secondUser.id, "Deuxième Boutique");

    const firstProduct = await createProduct(store.id, category.id, {
      name: "Produit 1",
    });

    const secondProduct = await createProduct(secondStore.id, category.id, {
      name: "Produit 2",
    });

    await addCartItem(session.id, cart.id, firstProduct.id, 1);

    await addCartItem(session.id, cart.id, secondProduct.id, 1);

    await expect(
      orderService.createFromCart(session.id, {
        ...validOrderInput,
        idempotencyKey: "order-multi-store-001",
      }),
    ).rejects.toMatchObject({
      code: "MULTIPLE_STORES_IN_CART",
    });
  });

  it("should snapshot the current product name and price", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      name: "Nom Original",
      price: 12000,
    });

    await addCartItem(session.id, cart.id, product.id, 2);

    const order = await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-snapshot-001",
    });

    expect(order.items[0]).toMatchObject({
      product_name: "Nom Original",
      unit_price: "12000.00",
      quantity: 2,
      subtotal: "24000.00",
    });
  });

  it("should calculate the total from server-side product prices", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product1 = await createProduct(store.id, category.id, {
      name: "Produit 1",
      price: 10000,
    });

    const product2 = await createProduct(store.id, category.id, {
      name: "Produit 2",
      price: 7500,
    });

    await addCartItem(session.id, cart.id, product1.id, 2);

    await addCartItem(session.id, cart.id, product2.id, 3);

    const order = await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-total-001",
    });

    /*
     * 2 × 10 000 + 3 × 7 500
     * = 20 000 + 22 500
     * = 42 500
     */
    expect(order.total_amount).toBe("42500.00");
  });

  it("should empty the cart after successful order creation", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await addCartItem(session.id, cart.id, product.id, 2);

    await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-clear-cart-001",
    });

    const items = await cartItemRepository.findByCartId(cart.id);

    expect(items).toHaveLength(0);
  });

  it("should create the order with pending status", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await addCartItem(session.id, cart.id, product.id, 1);

    const order = await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-pending-001",
    });

    expect(order.status).toBe("pending");
  });

  it("should persist the order and its items", async () => {
    const { session, store, category, cart } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await addCartItem(session.id, cart.id, product.id, 3);

    const order = await orderService.createFromCart(session.id, {
      ...validOrderInput,
      idempotencyKey: "order-persistence-001",
    });

    const persistedOrder = await orderRepository.findById(order.id);

    const persistedItems = await orderRepository.findItems(order.id);

    expect(persistedOrder).toBeDefined();

    expect(persistedOrder?.id).toBe(order.id);

    expect(persistedItems).toHaveLength(1);

    expect(persistedItems[0].product_id).toBe(product.id);

    expect(persistedItems[0].quantity).toBe(3);
  });

  describe("createDirect", () => {
    it("should create an order directly from a valid product", async () => {
      const { session, store, product } = await createDirectContext();

      const order = await orderService.createDirect(session.id, {
        ...validDirectOrderInput,
        productId: product.id,
      });

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();

      expect(order.reference).toMatch(/^ORD-\d{8}-[A-F0-9]{6}$/);

      expect(order.store_id).toBe(store.id);

      expect(order.session_id).toBe(session.id);

      expect(order.buyer_user_id).toBeNull();

      expect(order.status).toBe("pending");

      expect(order.currency).toBe("XOF");

      expect(order.buyer_phone).toBe(validDirectOrderInput.buyerPhone);

      expect(order.delivery_country).toBe(
        validDirectOrderInput.deliveryCountry,
      );

      expect(order.delivery_city).toBe(
        validDirectOrderInput.deliveryCity,
      );

      expect(order.delivery_address).toBe(
        validDirectOrderInput.deliveryAddress,
      );

      expect(order.total_amount).toBe("20000.00");

      expect(order.items).toHaveLength(1);

      expect(order.items[0]).toMatchObject({
        product_id: product.id,
        product_name: "Produit Test",
        unit_price: "10000.00",
        quantity: 2,
        subtotal: "20000.00",
      });
    });
  });

    it("should use the authenticated user from the session as buyer_user_id", async () => {
      const session = await createAnonymousSession();

      const buyer = await createUser("Buyer");

      await db("sessions")
        .where({ id: session.id })
        .update({
          user_id: buyer.id,
        });

      const storeOwner = await createUser("Store Owner");
      const store = await createStore(storeOwner.id);
      const category = await createCategory();

      const product = await createProduct(store.id, category.id);

      const order = await orderService.createDirect(session.id, {
        ...validDirectOrderInput,
        productId: product.id,
      });

      expect(order.buyer_user_id).toBe(buyer.id);
    });

    it("should reject an expired session", async () => {
      const session = await createAnonymousSession(
        new Date(Date.now() - 1000),
      );

      const storeOwner = await createUser("Store Owner");
      const store = await createStore(storeOwner.id);
      const category = await createCategory();

      const product = await createProduct(store.id, category.id);

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          idempotencyKey: "direct-expired-001",
        }),
      ).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });

    it("should reject a nonexistent product", async () => {
      const session = await createAnonymousSession();

      const fakeProductId =
        "00000000-0000-0000-0000-000000000000";

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: fakeProductId,
          idempotencyKey: "direct-product-not-found-001",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_NOT_FOUND",
      });
    });

    it("should reject an unavailable product", async () => {
      const { session, product } = await createDirectContext();

      await productRepository.setAvailability(
        product.id,
        "unavailable",
      );

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          idempotencyKey: "direct-unavailable-001",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_UNAVAILABLE",
      });
    });

    it("should reject an archived product", async () => {
      const { session, product } = await createDirectContext();

      await productRepository.setStatus(
        product.id,
        "archived",
      );

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          idempotencyKey: "direct-archived-001",
        }),
      ).rejects.toMatchObject({
        code: "PRODUCT_INACTIVE",
      });
    });

    it("should reject a product from an inactive store", async () => {
      const { session, store, product } =
        await createDirectContext();

      await storeRepository.setStatus(
        store.id,
        "inactive",
      );

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          idempotencyKey: "direct-inactive-store-001",
        }),
      ).rejects.toMatchObject({
        code: "STORE_INACTIVE",
      });
    });

    it("should reject a quantity equal to zero", async () => {
      const { session, product } = await createDirectContext();

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          quantity: 0,
          idempotencyKey: "direct-quantity-zero-001",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CART_ITEM_QUANTITY",
      });
    });

    it("should reject a negative quantity", async () => {
      const { session, product } = await createDirectContext();

      await expect(
        orderService.createDirect(session.id, {
          ...validDirectOrderInput,
          productId: product.id,
          quantity: -1,
          idempotencyKey: "direct-quantity-negative-001",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CART_ITEM_QUANTITY",
      });
    });



  // ---------------------------------------------------------------------------
  // IDEMPOTENCE
  // ---------------------------------------------------------------------------

  describe("idempotence", () => {
    it("should return the existing order when the same idempotency key is reused in the same session", async () => {
      const context = await createCartContext();

      const product = await createProduct(
        context.store.id,
        context.category.id,
        {
          name: "Produit idempotent",
          price: 15000,
        },
      );

      await addCartItem(context.session.id, context.cart.id, product.id, 1);

      const firstOrder = await orderService.createFromCart(context.session.id, {
        ...validOrderInput,
        idempotencyKey: "idem-same-session",
      });

      const secondOrder = await orderService.createFromCart(
        context.session.id,
        {
          ...validOrderInput,
          idempotencyKey: "idem-same-session",
        },
      );

      expect(secondOrder.id).toBe(firstOrder.id);

      expect(secondOrder.reference).toBe(firstOrder.reference);

      expect(secondOrder.total_amount).toBe(firstOrder.total_amount);
    });

    it("should not create a second order when the same idempotency key is reused", async () => {
      const context = await createCartContext();

      const product = await createProduct(
        context.store.id,
        context.category.id,
        {
          name: "Produit idempotent",
          price: 12000,
        },
      );

      await addCartItem(context.session.id, context.cart.id, product.id, 1);

      const firstOrder = await orderService.createFromCart(context.session.id, {
        ...validOrderInput,
        idempotencyKey: "idem-no-duplicate",
      });

      const secondOrder = await orderService.createFromCart(
        context.session.id,
        {
          ...validOrderInput,
          idempotencyKey: "idem-no-duplicate",
        },
      );

      const orders = await orderRepository.findBySessionId(context.session.id);

      expect(secondOrder.id).toBe(firstOrder.id);

      expect(orders).toHaveLength(1);
    });

    it("should reject reuse of an idempotency key from another session", async () => {
      const firstContext = await createCartContext();

      const firstProduct = await createProduct(
        firstContext.store.id,
        firstContext.category.id,
        {
          name: "Produit session 1",
          price: 10000,
        },
      );

      await addCartItem(
        firstContext.session.id,
        firstContext.cart.id,
        firstProduct.id,
        1,
      );

      const secondContext = await createCartContext();

      await orderService.createFromCart(firstContext.session.id, {
        ...validOrderInput,
        idempotencyKey: "idem-cross-session",
      });

      await expect(
        orderService.createFromCart(secondContext.session.id, {
          ...validOrderInput,
          idempotencyKey: "idem-cross-session",
        }),
      ).rejects.toMatchObject({
        code: "IDEMPOTENCY_KEY_CONFLICT",
      });
    });
  });

  // ---------------------------------------------------------------------------
  // TRANSACTION
  // ---------------------------------------------------------------------------

  describe("transaction", () => {
    it("should rollback the order when creating order items fails", async () => {
      const context = await createCartContext();

      const product = await createProduct(
        context.store.id,
        context.category.id,
        {
          name: "Produit transaction",
          price: 20000,
        },
      );

      await addCartItem(context.session.id, context.cart.id, product.id, 2);

      const createItemsSpy = vi
        .spyOn(OrderRepository.prototype, "createItems")
        .mockRejectedValueOnce(new Error("Simulated order item failure"));

      try {
        await expect(
          orderService.createFromCart(context.session.id, {
            ...validOrderInput,
            idempotencyKey: "transaction-rollback",
          }),
        ).rejects.toThrow("Simulated order item failure");
      } finally {
        createItemsSpy.mockRestore();
      }

      const orders = await orderRepository.findBySessionId(context.session.id);

      expect(orders).toHaveLength(0);

      const remainingItems = await cartItemRepository.findByCartId(
        context.cart.id,
      );

      expect(remainingItems).toHaveLength(1);

      expect(remainingItems[0].quantity).toBe(2);

      expect(remainingItems[0].product_id).toBe(product.id);
    });
  });

  // ---------------------------------------------------------------------------
  // ORDER STATE MACHINE
  // ---------------------------------------------------------------------------

  describe("order state machine", () => {
    it("should allow the complete valid order lifecycle", async () => {
      const { orderId } = await createPendingOrder(orderService);

      const confirmed = await orderService.updateStatus(orderId, "confirmed");

      expect(confirmed.status).toBe("confirmed");

      const preparing = await orderService.updateStatus(orderId, "preparing");

      expect(preparing.status).toBe("preparing");

      const ready = await orderService.updateStatus(orderId, "ready");

      expect(ready.status).toBe("ready");

      const delivering = await orderService.updateStatus(orderId, "delivering");

      expect(delivering.status).toBe("delivering");

      const delivered = await orderService.updateStatus(orderId, "delivered");

      expect(delivered.status).toBe("delivered");
    });

    it("should allow cancellation from pending", async () => {
      const { orderId } = await createPendingOrder(orderService);

      const order = await orderService.updateStatus(orderId, "cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should allow cancellation from confirmed", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      const order = await orderService.updateStatus(orderId, "cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should allow cancellation from preparing", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      await orderService.updateStatus(orderId, "preparing");

      const order = await orderService.updateStatus(orderId, "cancelled");

      expect(order.status).toBe("cancelled");
    });

    it("should reject cancellation from ready", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      await orderService.updateStatus(orderId, "preparing");

      await orderService.updateStatus(orderId, "ready");

      await expect(
        orderService.updateStatus(orderId, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject cancellation from delivering", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      await orderService.updateStatus(orderId, "preparing");

      await orderService.updateStatus(orderId, "ready");

      await orderService.updateStatus(orderId, "delivering");

      await expect(
        orderService.updateStatus(orderId, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject any transition from delivered", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      await orderService.updateStatus(orderId, "preparing");

      await orderService.updateStatus(orderId, "ready");

      await orderService.updateStatus(orderId, "delivering");

      await orderService.updateStatus(orderId, "delivered");

      await expect(
        orderService.updateStatus(orderId, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(orderId, "cancelled"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject any transition from cancelled", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "cancelled");

      await expect(
        orderService.updateStatus(orderId, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(orderId, "preparing"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(orderId, "delivering"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should reject backward transitions", async () => {
      const { orderId } = await createPendingOrder(orderService);

      await orderService.updateStatus(orderId, "confirmed");

      await orderService.updateStatus(orderId, "preparing");

      await orderService.updateStatus(orderId, "ready");

      await expect(
        orderService.updateStatus(orderId, "preparing"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(orderId, "confirmed"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });

      await expect(
        orderService.updateStatus(orderId, "pending"),
      ).rejects.toMatchObject({
        code: "INVALID_ORDER_STATUS_TRANSITION",
      });
    });

    it("should accept the same status as an idempotent transition", async () => {
      const { orderId } = await createPendingOrder(orderService);

      const first = await orderService.updateStatus(orderId, "pending");

      expect(first.status).toBe("pending");

      const second = await orderService.updateStatus(orderId, "pending");

      expect(second.status).toBe("pending");

      expect(second.id).toBe(first.id);
    });

    it("should reject updating a nonexistent order", async () => {
      await expect(
        orderService.updateStatus(
          "00000000-0000-0000-0000-000000000000",
          "confirmed",
        ),
      ).rejects.toMatchObject({
        code: "ORDER_NOT_FOUND",
      });
    });
  });
});
