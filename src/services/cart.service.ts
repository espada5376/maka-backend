import { Knex } from "knex";

import db from "../database/knex.js";

import { CartRepository } from "../database/repositories/cart.repository.js";

import { CartItemRepository } from "../database/repositories/cart-item.repository.js";

import { ProductRepository } from "../database/repositories/product.repository.js";

import { StoreRepository } from "../database/repositories/store.repository.js";

export type CartItemState = "available" | "unavailable";

export interface CartItemWithState {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  state: CartItemState;
}

export interface CartView {
  id: string;
  session_id: string;
  items: CartItemWithState[];
}

export class CartServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);

    this.name = "CartServiceError";
  }
}

export const CartErrorCode = {
  CART_NOT_FOUND: "CART_NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  STORE_NOT_FOUND: "STORE_NOT_FOUND",
  STORE_INACTIVE: "STORE_INACTIVE",
  PRODUCT_INACTIVE: "PRODUCT_INACTIVE",
  PRODUCT_UNAVAILABLE: "PRODUCT_UNAVAILABLE",
  MULTIPLE_STORES: "MULTIPLE_STORES",
  ITEM_NOT_FOUND: "ITEM_NOT_FOUND",
} as const;

export class CartService {
  constructor(
    private readonly database: Knex = db,
    private readonly cartRepository = new CartRepository(database),
    private readonly cartItemRepository = new CartItemRepository(database),
    private readonly productRepository = new ProductRepository(database),
    private readonly storeRepository = new StoreRepository(database),
  ) {}

  async getCart(sessionId: string): Promise<CartView> {
    const cart = await this.cartRepository.findBySessionId(sessionId);

    if (!cart) {
      throw new CartServiceError(
        CartErrorCode.CART_NOT_FOUND,
        "Cart not found",
      );
    }

    const items = await this.cartItemRepository.findByCartIdWithProductContext(
      cart.id,
    );

    const itemsWithState = items.map((item) => {
      const available =
        item.store_status === "active" &&
        item.product_status === "active" &&
        item.product_availability === "available";

      return {
        id: item.id,
        cart_id: item.cart_id,
        product_id: item.product_id,
        quantity: item.quantity,
        state: available ? ("available" as const) : ("unavailable" as const),
      };
    });

    return {
      id: cart.id,
      session_id: cart.session_id,
      items: itemsWithState,
    };
  }

  async addItem(sessionId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      throw new CartServiceError(
        "INVALID_QUANTITY",
        "Quantity must be greater than zero",
      );
    }

    const cart = await this.cartRepository.findBySessionId(sessionId);

    if (!cart) {
      throw new CartServiceError(
        CartErrorCode.CART_NOT_FOUND,
        "Cart not found",
      );
    }

    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new CartServiceError(
        CartErrorCode.PRODUCT_NOT_FOUND,
        "Product not found",
      );
    }

    const store = await this.storeRepository.findById(product.store_id);

    if (!store) {
      throw new CartServiceError(
        CartErrorCode.STORE_NOT_FOUND,
        "Store not found",
      );
    }

    if (store.status !== "active") {
      throw new CartServiceError(
        CartErrorCode.STORE_INACTIVE,
        "Store is inactive",
      );
    }

    if (product.status !== "active") {
      throw new CartServiceError(
        CartErrorCode.PRODUCT_INACTIVE,
        "Product is inactive",
      );
    }

    if (product.availability !== "available") {
      throw new CartServiceError(
        CartErrorCode.PRODUCT_UNAVAILABLE,
        "Product is unavailable",
      );
    }

    const existingItems = await this.cartItemRepository.findByCartId(cart.id);

    if (existingItems.length > 0) {
      const existingProduct = await this.productRepository.findById(
        existingItems[0].product_id,
      );

      if (existingProduct && existingProduct.store_id !== product.store_id) {
        throw new CartServiceError(
          CartErrorCode.MULTIPLE_STORES,
          "A cart cannot contain products from multiple stores",
        );
      }
    }

    const existingItem = await this.cartItemRepository.findByCartAndProduct(
      cart.id,
      product.id,
    );

    if (existingItem) {
      return this.cartItemRepository.updateQuantity(existingItem.id, {
        quantity: existingItem.quantity + quantity,
      });
    }

    return this.cartItemRepository.create({
      cart_id: cart.id,
      product_id: product.id,
      quantity,
    });
  }

  async updateItemQuantity(
    sessionId: string,
    itemId: string,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new CartServiceError(
        "INVALID_QUANTITY",
        "Quantity must be greater than zero",
      );
    }

    const cart = await this.cartRepository.findBySessionId(sessionId);

    if (!cart) {
      throw new CartServiceError(
        CartErrorCode.CART_NOT_FOUND,
        "Cart not found",
      );
    }

    const item = await this.cartItemRepository.findById(itemId);

    if (!item || item.cart_id !== cart.id) {
      throw new CartServiceError(
        CartErrorCode.ITEM_NOT_FOUND,
        "Cart item not found",
      );
    }

    return this.cartItemRepository.updateQuantity(item.id, {
      quantity,
    });
  }
  async removeItem(sessionId: string, itemId: string): Promise<void> {
    const cart = await this.cartRepository.findBySessionId(sessionId);

    if (!cart) {
      throw new CartServiceError(
        CartErrorCode.CART_NOT_FOUND,
        "Cart not found",
      );
    }

    const item = await this.cartItemRepository.findById(itemId);

    if (!item || item.cart_id !== cart.id) {
      throw new CartServiceError(
        CartErrorCode.ITEM_NOT_FOUND,
        "Cart item not found",
      );
    }

    await this.cartItemRepository.delete(item.id);
  }
}
