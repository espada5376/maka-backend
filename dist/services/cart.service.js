import db from "../database/knex.js";
import { CartRepository } from "../database/repositories/cart.repository.js";
import { CartItemRepository } from "../database/repositories/cart-item.repository.js";
import { ProductRepository } from "../database/repositories/product.repository.js";
import { StoreRepository } from "../database/repositories/store.repository.js";
import { EventRepository } from "../database/repositories/event.repository.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
export class CartService {
    database;
    cartRepository;
    cartItemRepository;
    productRepository;
    storeRepository;
    eventRepository;
    constructor(database = db, cartRepository = new CartRepository(database), cartItemRepository = new CartItemRepository(database), productRepository = new ProductRepository(database), storeRepository = new StoreRepository(database), eventRepository = new EventRepository(database)) {
        this.database = database;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.eventRepository = eventRepository;
    }
    async getCart(sessionId) {
        const cart = await this.cartRepository.findBySessionId(sessionId);
        if (!cart) {
            throw createAppError(Errors.CART_NOT_FOUND);
        }
        const items = await this.cartItemRepository.findByCartIdWithProductContext(cart.id);
        const itemsWithState = items.map((item) => {
            const available = item.store_status === "active" &&
                item.product_status === "active" &&
                item.product_availability === "available";
            return {
                id: item.id,
                cart_id: item.cart_id,
                product_id: item.product_id,
                quantity: item.quantity,
                state: available ? "available" : "unavailable",
            };
        });
        return {
            id: cart.id,
            session_id: cart.session_id,
            items: itemsWithState,
        };
    }
    async addItem(sessionId, productId, quantity) {
        this.validateQuantity(quantity);
        const cart = await this.cartRepository.findBySessionId(sessionId);
        if (!cart) {
            throw createAppError(Errors.CART_NOT_FOUND);
        }
        const product = await this.productRepository.findById(productId);
        if (!product) {
            throw createAppError(Errors.PRODUCT_NOT_FOUND);
        }
        const store = await this.storeRepository.findById(product.store_id);
        if (!store) {
            throw createAppError(Errors.STORE_NOT_FOUND);
        }
        if (store.status !== "active") {
            throw createAppError(Errors.STORE_INACTIVE);
        }
        if (product.status !== "active") {
            throw createAppError(Errors.PRODUCT_INACTIVE);
        }
        if (product.availability !== "available") {
            throw createAppError(Errors.PRODUCT_UNAVAILABLE);
        }
        const existingItems = await this.cartItemRepository.findByCartId(cart.id);
        /*
         * A cart can only contain products from one store.
         *
         * We verify every existing item rather than only the first one.
         */
        for (const existingItem of existingItems) {
            const existingProduct = await this.productRepository.findById(existingItem.product_id);
            if (existingProduct && existingProduct.store_id !== product.store_id) {
                throw createAppError(Errors.MULTIPLE_STORES_IN_CART);
            }
        }
        const existingItem = await this.cartItemRepository.findByCartAndProduct(cart.id, product.id);
        return this.database.transaction(async (trx) => {
            /*
             * Repositories used for mutations are bound to the transaction.
             */
            const transactionCartItemRepository = new CartItemRepository(trx);
            const transactionEventRepository = new EventRepository(trx);
            let item;
            if (existingItem) {
                item = await transactionCartItemRepository.updateQuantity(existingItem.id, {
                    quantity: existingItem.quantity + quantity,
                });
            }
            else {
                item = await transactionCartItemRepository.create({
                    cart_id: cart.id,
                    product_id: product.id,
                    quantity,
                });
            }
            if (!item) {
                throw createAppError(Errors.CART_ITEM_NOT_FOUND);
            }
            await transactionEventRepository.create({
                event_name: "cart.item_added",
                event_key: `cart:${cart.id}:item:${item.id}:added`,
                session_id: sessionId,
                user_id: null,
                store_id: product.store_id,
                product_id: product.id,
                metadata: {
                    cart_id: cart.id,
                    item_id: item.id,
                    quantity,
                },
            });
            return item;
        });
    }
    async updateItemQuantity(sessionId, itemId, quantity) {
        this.validateQuantity(quantity);
        const cart = await this.cartRepository.findBySessionId(sessionId);
        if (!cart) {
            throw createAppError(Errors.CART_NOT_FOUND);
        }
        const item = await this.cartItemRepository.findById(itemId);
        if (!item || item.cart_id !== cart.id) {
            throw createAppError(Errors.CART_ITEM_NOT_FOUND);
        }
        const itemProduct = await this.productRepository.findById(item.product_id);
        if (!itemProduct) {
            throw createAppError(Errors.PRODUCT_NOT_FOUND);
        }
        const previousQuantity = item.quantity;
        return this.database.transaction(async (trx) => {
            const transactionCartItemRepository = new CartItemRepository(trx);
            const transactionEventRepository = new EventRepository(trx);
            const updatedItem = await transactionCartItemRepository.updateQuantity(item.id, {
                quantity,
            });
            if (!updatedItem) {
                throw createAppError(Errors.CART_ITEM_NOT_FOUND);
            }
            await transactionEventRepository.create({
                event_name: "cart.item_quantity_updated",
                event_key: `cart:${cart.id}:item:${item.id}:quantity-updated`,
                session_id: sessionId,
                user_id: null,
                store_id: itemProduct.store_id,
                product_id: item.product_id,
                metadata: {
                    cart_id: cart.id,
                    item_id: item.id,
                    from_quantity: previousQuantity,
                    to_quantity: quantity,
                },
            });
            return updatedItem;
        });
    }
    async removeItem(sessionId, itemId) {
        const cart = await this.cartRepository.findBySessionId(sessionId);
        if (!cart) {
            throw createAppError(Errors.CART_NOT_FOUND);
        }
        const item = await this.cartItemRepository.findById(itemId);
        if (!item || item.cart_id !== cart.id) {
            throw createAppError(Errors.CART_ITEM_NOT_FOUND);
        }
        const itemProduct = await this.productRepository.findById(item.product_id);
        if (!itemProduct) {
            throw createAppError(Errors.PRODUCT_NOT_FOUND);
        }
        await this.database.transaction(async (trx) => {
            const transactionCartItemRepository = new CartItemRepository(trx);
            const transactionEventRepository = new EventRepository(trx);
            await transactionCartItemRepository.delete(item.id);
            await transactionEventRepository.create({
                event_name: "cart.item_removed",
                event_key: `cart:${cart.id}:item:${item.id}:removed`,
                session_id: sessionId,
                user_id: null,
                store_id: itemProduct.store_id,
                product_id: item.product_id,
                metadata: {
                    cart_id: cart.id,
                    item_id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                },
            });
        });
    }
    validateQuantity(quantity) {
        if (typeof quantity !== "number" ||
            !Number.isInteger(quantity) ||
            !Number.isFinite(quantity) ||
            quantity <= 0) {
            throw createAppError(Errors.INVALID_CART_ITEM_QUANTITY);
        }
    }
}
