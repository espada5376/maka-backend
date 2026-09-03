import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  CartItemRepository,
} from "../../../src/database/repositories/cart-item.repository";

import {
  CartRepository,
} from "../../../src/database/repositories/cart.repository";

import {
  ProductRepository,
} from "../../../src/database/repositories/product.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import {
  StoreRepository,
} from "../../../src/database/repositories/store.repository";

import {
  CategoryRepository,
} from "../../../src/database/repositories/category.repository";

import { cleanDatabase } from "../../helpers/database";

describe("CartItemRepository", () => {
  const cartItemRepository =
    new CartItemRepository(db);

  const cartRepository =
    new CartRepository(db);

  const productRepository =
    new ProductRepository(db);

  const userRepository =
    new UserRepository(db);

  const storeRepository =
    new StoreRepository(db);

  const categoryRepository =
    new CategoryRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createCartAndProduct() {
    const user = await userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name: "Cart Owner",
    });

    const store = await storeRepository.create({
      owner_id: user.id,
      name: "Ma Boutique",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const category =
      await categoryRepository.create({
        name: "Beauté",
        slug: `beaute-${Date.now()}-${Math.floor(
          Math.random() * 10000,
        )}`,
      });

    const product =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Perruque naturelle",
        price: 45000,
      });

    const [session] = await db("sessions")
      .insert({
        user_id: null,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      })
      .returning("*");

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    return {
      user,
      store,
      category,
      product,
      session,
      cart,
    };
  }

  it("should create a cart item", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const item =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 2,
      });

    expect(item).toBeDefined();
    expect(item.cart_id).toBe(cart.id);
    expect(item.product_id).toBe(product.id);
    expect(item.quantity).toBe(2);
  });

  it("should find a cart item by id", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const created =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 2,
      });

    const item =
      await cartItemRepository.findById(
        created.id,
      );

    expect(item).toBeDefined();
    expect(item?.id).toBe(created.id);
  });

  it("should find items by cart id", async () => {
    const {
      cart,
      product,
      store,
      category,
    } = await createCartAndProduct();

    const product2 =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit 2",
        price: 20000,
      });

    await cartItemRepository.create({
      cart_id: cart.id,
      product_id: product.id,
      quantity: 2,
    });

    await cartItemRepository.create({
      cart_id: cart.id,
      product_id: product2.id,
      quantity: 1,
    });

    const items =
      await cartItemRepository.findByCartId(
        cart.id,
      );

    expect(items).toHaveLength(2);

    expect(
      items.map((item) => item.product_id),
    ).toContain(product.id);

    expect(
      items.map((item) => item.product_id),
    ).toContain(product2.id);
  });

  it("should find an item by cart and product", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const created =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 3,
      });

    const item =
      await cartItemRepository.findByCartAndProduct(
        cart.id,
        product.id,
      );

    expect(item).toBeDefined();
    expect(item?.id).toBe(created.id);
    expect(item?.quantity).toBe(3);
  });

  it("should update the quantity", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const created =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 2,
      });

    const updated =
      await cartItemRepository.updateQuantity(
        created.id,
        {
          quantity: 5,
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.quantity).toBe(5);
  });

  it("should delete a cart item", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const created =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 2,
      });

    const deleted =
      await cartItemRepository.delete(
        created.id,
      );

    expect(deleted).toBe(1);

    const item =
      await cartItemRepository.findById(
        created.id,
      );

    expect(item).toBeUndefined();
  });

  it("should delete all items of a cart", async () => {
    const {
      cart,
      product,
      store,
      category,
    } = await createCartAndProduct();

    const product2 =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit 2",
        price: 20000,
      });

    await cartItemRepository.create({
      cart_id: cart.id,
      product_id: product.id,
      quantity: 1,
    });

    await cartItemRepository.create({
      cart_id: cart.id,
      product_id: product2.id,
      quantity: 2,
    });

    const deleted =
      await cartItemRepository.deleteByCartId(
        cart.id,
      );

    expect(deleted).toBe(2);

    const items =
      await cartItemRepository.findByCartId(
        cart.id,
      );

    expect(items).toHaveLength(0);
  });

  it("should reject quantity equal to zero", async () => {
    const { cart, product } =
      await createCartAndProduct();

    await expect(
      cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 0,
      }),
    ).rejects.toThrow();
  });

  it("should reject a negative quantity", async () => {
    const { cart, product } =
      await createCartAndProduct();

    await expect(
      cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: -1,
      }),
    ).rejects.toThrow();
  });

  it("should reject a nonexistent product", async () => {
    const { cart } =
      await createCartAndProduct();

    await expect(
      cartItemRepository.create({
        cart_id: cart.id,
        product_id:
          "00000000-0000-0000-0000-000000000000",
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("should reject a nonexistent cart", async () => {
    const { product } =
      await createCartAndProduct();

    await expect(
      cartItemRepository.create({
        cart_id:
          "00000000-0000-0000-0000-000000000000",
        product_id: product.id,
        quantity: 1,
      }),
    ).rejects.toThrow();
  });

  it("should reject duplicate product in the same cart", async () => {
    const { cart, product } =
      await createCartAndProduct();

    await cartItemRepository.create({
      cart_id: cart.id,
      product_id: product.id,
      quantity: 1,
    });

    await expect(
      cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 2,
      }),
    ).rejects.toThrow();
  });

  it("should cascade delete cart items when the cart is deleted", async () => {
    const { cart, product } =
      await createCartAndProduct();

    const item =
      await cartItemRepository.create({
        cart_id: cart.id,
        product_id: product.id,
        quantity: 1,
      });

    await db("carts")
      .where({ id: cart.id })
      .del();

    const deletedItem =
      await cartItemRepository.findById(
        item.id,
      );

    expect(deletedItem).toBeUndefined();
  });
});
