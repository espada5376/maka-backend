import db from "../database/knex.js";
import { CartRepository } from "../database/repositories/cart.repository.js";
import { CartItemRepository } from "../database/repositories/cart-item.repository.js";
import { ProductRepository } from "../database/repositories/product.repository.js";
import { StoreRepository } from "../database/repositories/store.repository.js";
import { EventRepository } from "../database/repositories/event.repository.js";
export class CartServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
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
    INVALID_QUANTITY: "INVALID_QUANTITY",
};
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
            throw new CartServiceError(CartErrorCode.CART_NOT_FOUND, "Cart not found");
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
            throw new CartServiceError(CartErrorCode.CART_NOT_FOUND, "Cart not found");
        }
        const product = await this.productRepository.findById(productId);
        if (!product) {
            throw new CartServiceError(CartErrorCode.PRODUCT_NOT_FOUND, "Product not found");
        }
        const store = await this.storeRepository.findById(product.store_id);
        if (!store) {
            throw new CartServiceError(CartErrorCode.STORE_NOT_FOUND, "Store not found");
        }
        if (store.status !== "active") {
            throw new CartServiceError(CartErrorCode.STORE_INACTIVE, "Store is inactive");
        }
        if (product.status !== "active") {
            throw new CartServiceError(CartErrorCode.PRODUCT_INACTIVE, "Product is inactive");
        }
        if (product.availability !== "available") {
            throw new CartServiceError(CartErrorCode.PRODUCT_UNAVAILABLE, "Product is unavailable");
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
                throw new CartServiceError(CartErrorCode.MULTIPLE_STORES, "A cart cannot contain products from multiple stores");
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
            throw new CartServiceError(CartErrorCode.CART_NOT_FOUND, "Cart not found");
        }
        const item = await this.cartItemRepository.findById(itemId);
        if (!item || item.cart_id !== cart.id) {
            throw new CartServiceError(CartErrorCode.ITEM_NOT_FOUND, "Cart item not found");
        }
        const itemProduct = await this.productRepository.findById(item.product_id);
        if (!itemProduct) {
            throw new CartServiceError(CartErrorCode.PRODUCT_NOT_FOUND, "Product not found");
        }
        const previousQuantity = item.quantity;
        return this.database.transaction(async (trx) => {
            const transactionCartItemRepository = new CartItemRepository(trx);
            const transactionEventRepository = new EventRepository(trx);
            const updatedItem = await transactionCartItemRepository.updateQuantity(item.id, {
                quantity,
            });
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
            throw new CartServiceError(CartErrorCode.CART_NOT_FOUND, "Cart not found");
        }
        const item = await this.cartItemRepository.findById(itemId);
        if (!item || item.cart_id !== cart.id) {
            throw new CartServiceError(CartErrorCode.ITEM_NOT_FOUND, "Cart item not found");
        }
        const itemProduct = await this.productRepository.findById(item.product_id);
        if (!itemProduct) {
            throw new CartServiceError(CartErrorCode.PRODUCT_NOT_FOUND, "Product not found");
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
            throw new CartServiceError(CartErrorCode.INVALID_QUANTITY, "Quantity must be a positive integer");
        }
    }
}
