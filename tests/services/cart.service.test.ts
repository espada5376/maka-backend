import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import db from "../../src/database/knex";

import {
  CartService,
  CartServiceError,
  CartErrorCode,
} from "../../src/services/cart.service";

import { UserRepository } from "../../src/database/repositories/user.repository";

import { StoreRepository } from "../../src/database/repositories/store.repository";

import { CategoryRepository } from "../../src/database/repositories/category.repository";

import { ProductRepository } from "../../src/database/repositories/product.repository";

import { CartRepository } from "../../src/database/repositories/cart.repository";

import { CartItemRepository } from "../../src/database/repositories/cart-item.repository";

import { cleanDatabase } from "../helpers/database";

describe("CartService", () => {
  const cartService = new CartService(db);

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

  async function createAnonymousSession() {
    const [session] = await db("sessions")
      .insert({
        user_id: null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
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

  it("should add an available product to the cart", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const item = await cartService.addItem(session.id, product.id, 2);

    expect(item).toBeDefined();
    expect(item?.cart_id).toBe(
      (await cartRepository.findBySessionId(session.id))?.id,
    );
    expect(item?.product_id).toBe(product.id);
    expect(item?.quantity).toBe(2);
  });

  it("should reject an unavailable product", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      availability: "unavailable",
    });

    await expect(
      cartService.addItem(session.id, product.id, 1),
    ).rejects.toMatchObject({
      code: CartErrorCode.PRODUCT_UNAVAILABLE,
    });
  });

  it("should reject an archived product", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id, {
      status: "archived",
    });

    await expect(
      cartService.addItem(session.id, product.id, 1),
    ).rejects.toMatchObject({
      code: CartErrorCode.PRODUCT_INACTIVE,
    });
  });

  it("should reject a product from an inactive store", async () => {
    const { session, store, category } = await createCartContext();

    await storeRepository.setStatus(store.id, "inactive");

    const product = await createProduct(store.id, category.id);

    await expect(
      cartService.addItem(session.id, product.id, 1),
    ).rejects.toMatchObject({
      code: CartErrorCode.STORE_INACTIVE,
    });
  });

  it("should reject an invalid quantity", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await expect(
      cartService.addItem(session.id, product.id, 0),
    ).rejects.toMatchObject({
      code: "INVALID_QUANTITY",
    });

    await expect(
      cartService.addItem(session.id, product.id, -1),
    ).rejects.toMatchObject({
      code: "INVALID_QUANTITY",
    });
  });

  it("should increase the quantity when adding the same product twice", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const first = await cartService.addItem(session.id, product.id, 2);

    const second = await cartService.addItem(session.id, product.id, 3);

    expect(first?.id).toBe(second?.id);

    expect(second?.quantity).toBe(5);

    const cart = await cartRepository.findBySessionId(session.id);

    const items = await cartItemRepository.findByCartId(cart!.id);

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it("should allow multiple products from the same store", async () => {
    const { session, store, category } = await createCartContext();

    const product1 = await createProduct(store.id, category.id, {
      name: "Produit 1",
    });

    const product2 = await createProduct(store.id, category.id, {
      name: "Produit 2",
    });

    await cartService.addItem(session.id, product1.id, 1);

    await cartService.addItem(session.id, product2.id, 2);

    const cart = await cartRepository.findBySessionId(session.id);

    const items = await cartItemRepository.findByCartId(cart!.id);

    expect(items).toHaveLength(2);
  });

  it("should reject products from multiple stores", async () => {
    const { session, store, category } = await createCartContext();

    const secondUser = await createUser("Second Owner");

    const secondStore = await createStore(secondUser.id, "Deuxième Boutique");

    const firstProduct = await createProduct(store.id, category.id, {
      name: "Produit Boutique 1",
    });

    const secondProduct = await createProduct(secondStore.id, category.id, {
      name: "Produit Boutique 2",
    });

    await cartService.addItem(session.id, firstProduct.id, 1);

    await expect(
      cartService.addItem(session.id, secondProduct.id, 1),
    ).rejects.toMatchObject({
      code: CartErrorCode.MULTIPLE_STORES,
    });
  });

  it("should show an added product as unavailable when it becomes unavailable", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const item = await cartService.addItem(session.id, product.id, 1);

    expect(item).toBeDefined();

    let cart = await cartService.getCart(session.id);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].state).toBe("available");

    await productRepository.setAvailability(product.id, "unavailable");

    cart = await cartService.getCart(session.id);

    expect(cart.items).toHaveLength(1);

    expect(cart.items[0].product_id).toBe(product.id);

    expect(cart.items[0].quantity).toBe(1);

    expect(cart.items[0].state).toBe("unavailable");
  });

  it("should show cart items as unavailable when the store becomes inactive", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await cartService.addItem(session.id, product.id, 2);

    let cart = await cartService.getCart(session.id);

    expect(cart.items[0].state).toBe("available");

    await storeRepository.setStatus(store.id, "inactive");

    cart = await cartService.getCart(session.id);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].state).toBe("unavailable");
    expect(cart.items[0].quantity).toBe(2);
  });

  it("should show an archived product as unavailable", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await cartService.addItem(session.id, product.id, 1);

    await productRepository.setStatus(product.id, "archived");

    const cart = await cartService.getCart(session.id);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].state).toBe("unavailable");
  });

  it("should become available again when the product becomes available", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    await cartService.addItem(session.id, product.id, 1);

    await productRepository.setAvailability(product.id, "unavailable");

    let cart = await cartService.getCart(session.id);

    expect(cart.items[0].state).toBe("unavailable");

    await productRepository.setAvailability(product.id, "available");

    cart = await cartService.getCart(session.id);

    expect(cart.items[0].state).toBe("available");
  });

  it("should update an item quantity", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const item = await cartService.addItem(session.id, product.id, 2);

    const updated = await cartService.updateItemQuantity(
      session.id,
      item!.id,
      7,
    );

    expect(updated).toBeDefined();
    expect(updated?.id).toBe(item!.id);
    expect(updated?.quantity).toBe(7);
  });

  it("should reject an invalid quantity when updating an item", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const item = await cartService.addItem(session.id, product.id, 2);

    await expect(
      cartService.updateItemQuantity(session.id, item!.id, 0),
    ).rejects.toMatchObject({
      code: "INVALID_QUANTITY",
    });
  });

  it("should reject updating an item belonging to another cart", async () => {
    const first = await createCartContext();

    const second = await createCartContext();

    const product = await createProduct(first.store.id, first.category.id);

    const item = await cartService.addItem(first.session.id, product.id, 1);

    await expect(
      cartService.updateItemQuantity(second.session.id, item!.id, 5),
    ).rejects.toMatchObject({
      code: CartErrorCode.ITEM_NOT_FOUND,
    });
  });

  it("should remove an item from the cart", async () => {
    const { session, store, category } = await createCartContext();

    const product = await createProduct(store.id, category.id);

    const item = await cartService.addItem(session.id, product.id, 1);

    await cartService.removeItem(session.id, item!.id);

    const cart = await cartRepository.findBySessionId(session.id);

    const items = await cartItemRepository.findByCartId(cart!.id);

    expect(items).toHaveLength(0);
  });

  it("should reject removing an item belonging to another cart", async () => {
    const first = await createCartContext();

    const second = await createCartContext();

    const product = await createProduct(first.store.id, first.category.id);

    const item = await cartService.addItem(first.session.id, product.id, 1);

    await expect(
      cartService.removeItem(second.session.id, item!.id),
    ).rejects.toMatchObject({
      code: CartErrorCode.ITEM_NOT_FOUND,
    });
  });

  it("should reject operations on a nonexistent cart", async () => {
    const fakeSessionId = "00000000-0000-0000-0000-000000000000";

    await expect(cartService.getCart(fakeSessionId)).rejects.toMatchObject({
      code: CartErrorCode.CART_NOT_FOUND,
    });

    await expect(
      cartService.addItem(fakeSessionId, fakeSessionId, 1),
    ).rejects.toMatchObject({
      code: CartErrorCode.CART_NOT_FOUND,
    });
  });
});
