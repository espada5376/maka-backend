import type { Knex } from "knex";
import { randomBytes } from "node:crypto";

import { NotificationService } from "./notification.service.js";
import { NotificationType } from "../notifications/types/notification-type.js";

import db from "../database/knex.js";

import {
  OrderRepository,
  type Order,
  type OrderItem,
  type OrderStatus,
  type CreateOrderItemData,
} from "../database/repositories/order.repository.js";

import { ProductRepository } from "../database/repositories/product.repository.js";

import { SessionRepository } from "../database/repositories/session.repository.js";

import { CartRepository } from "../database/repositories/cart.repository.js";

import {
  CartItemRepository,
  type CartItemWithProductContext,
} from "../database/repositories/cart-item.repository.js";

import { EventRepository } from "../database/repositories/event.repository.js";

import { StoreRepository } from "../database/repositories/store.repository.js";

import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";

export interface CreateOrderInput {
  idempotencyKey: string;
  buyerPhone: string;
  deliveryCountry: string;
  deliveryCity: string;
  deliveryAddress: string;
}

export interface CreateDirectOrderInput {
  productId: string;
  quantity: number;
  idempotencyKey: string;
  buyerPhone: string;
  deliveryCountry: string;
  deliveryCity: string;
  deliveryAddress: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface IOrderService {
  createFromCart(
    sessionId: string,
    input: CreateOrderInput,
  ): Promise<OrderWithItems>;

  getForCurrentBuyer(sessionId: string): Promise<OrderWithItems[]>;

  getForCurrentBuyerById(
    sessionId: string,
    orderId: string,
  ): Promise<OrderWithItems>;

  getForSeller(sessionId: string, storeId: string): Promise<OrderWithItems[]>;

  updateStatusBySeller(
    sessionId: string,
    storeId: string,
    orderId: string,
    status: OrderStatus,
  ): Promise<Order>;

  createDirect(
    sessionId: string,
    input: CreateDirectOrderInput,
  ): Promise<OrderWithItems>;

  getById(orderId: string): Promise<OrderWithItems>;

  getByReference(reference: string): Promise<OrderWithItems>;

  getForSession(sessionId: string): Promise<OrderWithItems[]>;

  getForBuyer(buyerUserId: string): Promise<OrderWithItems[]>;

  getForStore(storeId: string): Promise<OrderWithItems[]>;

  updateStatus(orderId: string, status: OrderStatus): Promise<Order>;
}

const PLATFORM_CURRENCY = "XOF";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["pending", "confirmed", "cancelled"],

  confirmed: ["confirmed", "preparing", "cancelled"],

  preparing: ["preparing", "ready", "cancelled"],

  ready: ["ready", "delivering"],

  delivering: ["delivering", "delivered"],

  delivered: ["delivered"],

  cancelled: ["cancelled"],
};

function generateOrderReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const random = randomBytes(3).toString("hex").toUpperCase();

  return `ORD-${date}-${random}`;
}

function toMinorUnits(value: string | number): number {
  return Math.round(Number(value) * 100);
}

function fromMinorUnits(value: number): number {
  return value / 100;
}

export class OrderService implements IOrderService {
  constructor(
    private readonly database: Knex = db,
    private readonly orderRepository = new OrderRepository(database),
    private readonly sessionRepository = new SessionRepository(database),
    private readonly cartRepository = new CartRepository(database),
    private readonly cartItemRepository = new CartItemRepository(database),
    private readonly storeRepository = new StoreRepository(database),
    private readonly productRepository = new ProductRepository(database),
    private readonly notificationService: NotificationService = new NotificationService(
      undefined,
      undefined,
      database,
    ),
  ) {}

  private validateCartItems(items: CartItemWithProductContext[]): void {
    const storeId = items[0]?.product_store_id;

    if (!storeId) {
      throw createAppError(Errors.PRODUCT_NOT_FOUND);
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        throw createAppError(Errors.INVALID_CART_ITEM_QUANTITY);
      }

      if (item.product_status !== "active") {
        throw createAppError(Errors.PRODUCT_INACTIVE);
      }

      if (item.product_availability !== "available") {
        throw createAppError(Errors.PRODUCT_UNAVAILABLE);
      }

      if (item.product_store_id !== storeId) {
        throw createAppError(Errors.MULTIPLE_STORES_IN_CART);
      }

      if (item.store_status !== "active") {
        throw createAppError(Errors.STORE_INACTIVE);
      }
    }
  }

  private calculateTotal(items: CartItemWithProductContext[]): number {
    const totalMinorUnits = items.reduce((total, item) => {
      const unitPriceMinorUnits = toMinorUnits(item.product_price);

      return total + unitPriceMinorUnits * item.quantity;
    }, 0);

    return fromMinorUnits(totalMinorUnits);
  }

  private buildOrderItems(
    orderId: string,
    cartItems: CartItemWithProductContext[],
  ): CreateOrderItemData[] {
    return cartItems.map((item) => {
      const unitPriceMinorUnits = toMinorUnits(item.product_price);

      const subtotalMinorUnits = unitPriceMinorUnits * item.quantity;

      return {
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: fromMinorUnits(unitPriceMinorUnits),
        quantity: item.quantity,
        subtotal: fromMinorUnits(subtotalMinorUnits),
      };
    });
  }

  private async buildOrderWithItems(order: Order): Promise<OrderWithItems> {
    const items = await this.orderRepository.findItems(order.id);

    return {
      ...order,
      items,
    };
  }

  private async getValidSession(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw createAppError(Errors.SESSION_NOT_FOUND);
    }

    if (session.expires_at <= new Date()) {
      throw createAppError(Errors.SESSION_EXPIRED);
    }

    return session;
  }

  private async getOwnedStoreForSession(sessionId: string, storeId: string) {
    const session = await this.getValidSession(sessionId);

    if (!session.user_id) {
      throw createAppError(Errors.STORE_FORBIDDEN);
    }

    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    if (store.owner_id !== session.user_id) {
      throw createAppError(Errors.STORE_FORBIDDEN);
    }

    return { session, store };
  }

  async getById(orderId: string): Promise<OrderWithItems> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    return this.buildOrderWithItems(order);
  }

  async getForCurrentBuyer(sessionId: string): Promise<OrderWithItems[]> {
    const session = await this.getValidSession(sessionId);

    let orders: Order[];

    if (!session.user_id) {
      orders = await this.orderRepository.findBySessionId(session.id);
    } else {
      const [accountOrders, sessionOrders] = await Promise.all([
        this.orderRepository.findByBuyerUserId(session.user_id),
        this.orderRepository.findBySessionId(session.id),
      ]);

      const ordersById = new Map<string, Order>();

      for (const order of [...accountOrders, ...sessionOrders]) {
        ordersById.set(order.id, order);
      }

      orders = [...ordersById.values()].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return Promise.all(orders.map((order) => this.buildOrderWithItems(order)));
  }

  async getForCurrentBuyerById(
    sessionId: string,
    orderId: string,
  ): Promise<OrderWithItems> {
    const session = await this.getValidSession(sessionId);
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    const belongsToSession = order.session_id === session.id;
    const belongsToAccount =
      session.user_id !== null && order.buyer_user_id === session.user_id;

    if (!belongsToSession && !belongsToAccount) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    return this.buildOrderWithItems(order);
  }

  async getByReference(reference: string): Promise<OrderWithItems> {
    const order = await this.orderRepository.findByReference(reference);

    if (!order) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    return this.buildOrderWithItems(order);
  }

  async getForSession(sessionId: string): Promise<OrderWithItems[]> {
    const orders = await this.orderRepository.findBySessionId(sessionId);

    return Promise.all(orders.map((order) => this.buildOrderWithItems(order)));
  }

  async getForBuyer(buyerUserId: string): Promise<OrderWithItems[]> {
    const orders = await this.orderRepository.findByBuyerUserId(buyerUserId);

    return Promise.all(orders.map((order) => this.buildOrderWithItems(order)));
  }

  async getForStore(storeId: string): Promise<OrderWithItems[]> {
    const orders = await this.orderRepository.findByStoreId(storeId);

    return Promise.all(orders.map((order) => this.buildOrderWithItems(order)));
  }

  async getForSeller(
    sessionId: string,
    storeId: string,
  ): Promise<OrderWithItems[]> {
    await this.getOwnedStoreForSession(sessionId, storeId);

    const orders = await this.orderRepository.findByStoreId(storeId);

    return Promise.all(orders.map((order) => this.buildOrderWithItems(order)));
  }

  async updateStatusBySeller(
    sessionId: string,
    storeId: string,
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<Order> {
    await this.getOwnedStoreForSession(sessionId, storeId);

    const order = await this.orderRepository.findById(orderId);

    if (!order || order.store_id !== storeId) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[order.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw createAppError(Errors.INVALID_ORDER_STATUS_TRANSITION);
    }

    const updatedOrder = await this.orderRepository.updateStatus(
      orderId,
      newStatus,
    );

    if (!updatedOrder) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    return updatedOrder;
  }

  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    const allowedTransitions = ALLOWED_TRANSITIONS[order.status];

    if (!allowedTransitions.includes(newStatus)) {
      throw createAppError(Errors.INVALID_ORDER_STATUS_TRANSITION);
    }

    const updatedOrder = await this.orderRepository.updateStatus(
      orderId,
      newStatus,
    );

    if (!updatedOrder) {
      throw createAppError(Errors.ORDER_NOT_FOUND);
    }

    return updatedOrder;
  }

  async createDirect(
    sessionId: string,
    input: CreateDirectOrderInput,
  ): Promise<OrderWithItems> {
    /*
     * 1. Vérifier la session
     */
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw createAppError(Errors.SESSION_NOT_FOUND);
    }

    if (session.expires_at <= new Date()) {
      throw createAppError(Errors.SESSION_EXPIRED);
    }

    /*
     * 2. Vérifier l'idempotency key
     */
    const existingOrder = await this.orderRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existingOrder) {
      if (existingOrder.session_id !== sessionId) {
        throw createAppError(Errors.IDEMPOTENCY_KEY_CONFLICT);
      }

      return this.buildOrderWithItems(existingOrder);
    }

    /*
     * 3. Valider la quantité
     */
    if (input.quantity <= 0) {
      throw createAppError(Errors.INVALID_CART_ITEM_QUANTITY);
    }

    /*
     * 4. Récupérer le produit
     */
    const product = await this.productRepository.findById(input.productId);

    if (!product) {
      throw createAppError(Errors.PRODUCT_NOT_FOUND);
    }

    /*
     * 5. Valider le produit
     */
    if (product.status !== "active") {
      throw createAppError(Errors.PRODUCT_INACTIVE);
    }

    if (product.availability !== "available") {
      throw createAppError(Errors.PRODUCT_UNAVAILABLE);
    }

    /*
     * 6. Récupérer le store
     */
    const store = await this.storeRepository.findById(product.store_id);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    if (store.status !== "active") {
      throw createAppError(Errors.STORE_INACTIVE);
    }

    /*
     * 7. Vérifier la devise plateforme
     */
    if (store.currency !== PLATFORM_CURRENCY) {
      throw createAppError(Errors.CURRENCY_MISMATCH);
    }

    /*
     * 8. Calcul serveur du montant
     */
    const unitPriceMinorUnits = toMinorUnits(product.price);

    const subtotalMinorUnits = unitPriceMinorUnits * input.quantity;

    const totalAmount = fromMinorUnits(subtotalMinorUnits);

    /*
     * 9. Générer la référence
     */
    const orderReference = generateOrderReference();

    /*
     * 10. Transaction atomique :
     *     commande + item + événement
     */
    const order = await this.database.transaction(async (trx) => {
      const trxEventRepository = new EventRepository(trx);

      const trxOrderRepository = new OrderRepository(trx);

      const createdOrder = await trxOrderRepository.create({
        reference: orderReference,

        idempotency_key: input.idempotencyKey,

        store_id: store.id,

        buyer_user_id: session.user_id,

        session_id: session.id,

        status: "pending",

        total_amount: totalAmount,

        currency: PLATFORM_CURRENCY,

        buyer_phone: input.buyerPhone,

        delivery_country: input.deliveryCountry,

        delivery_city: input.deliveryCity,

        delivery_address: input.deliveryAddress,
      });

      const orderItem = await trxOrderRepository.createItem({
        order_id: createdOrder.id,

        product_id: product.id,

        product_name: product.name,

        unit_price: fromMinorUnits(unitPriceMinorUnits),

        quantity: input.quantity,

        subtotal: totalAmount,
      });

      await trxEventRepository.create({
        event_name: "order.created",

        event_key: `order:${createdOrder.id}:created`,

        session_id: session.id,

        user_id: session.user_id,

        store_id: store.id,

        product_id: product.id,

        order_id: createdOrder.id,

        metadata: {
          source: "product",
          item_count: 1,
          total_amount: totalAmount,
          currency: PLATFORM_CURRENCY,
        },
      });

      await this.notificationService.create(
        {
          user_id: store.owner_id,
          type: NotificationType.NEW_ORDER_FOR_SELLER,
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: {
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: totalAmount,
            currency: PLATFORM_CURRENCY,
          },
        },
        trx,
      );

      if (session.user_id) {
        await this.notificationService.create(
          {
            user_id: session.user_id,
            type: NotificationType.NEW_ORDER_FOR_BUYER,
            title: "Commande créée",
            body: `Votre commande ${createdOrder.reference} a été créée.`,
            data: {
              order_id: createdOrder.id,
              order_reference: createdOrder.reference,
              total_amount: totalAmount,
              currency: PLATFORM_CURRENCY,
            },
          },
          trx,
        );
      }

      return {
        ...createdOrder,
        items: [orderItem],
      };
    });

    /*
     * 11. Retourner la commande
     */
    return order;
  }

  async createFromCart(
    sessionId: string,
    input: CreateOrderInput,
  ): Promise<OrderWithItems> {
    /*
     * 1. Vérifier la session
     */
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw createAppError(Errors.SESSION_NOT_FOUND);
    }

    if (session.expires_at <= new Date()) {
      throw createAppError(Errors.SESSION_EXPIRED);
    }

    /*
     * 2. Vérifier l'idempotency key
     */
    const existingOrder = await this.orderRepository.findByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existingOrder) {
      if (existingOrder.session_id !== sessionId) {
        throw createAppError(Errors.IDEMPOTENCY_KEY_CONFLICT);
      }

      return this.buildOrderWithItems(existingOrder);
    }

    /*
     * 3. Vérifier le panier
     */
    const cart = await this.cartRepository.findBySessionId(sessionId);

    if (!cart) {
      throw createAppError(Errors.CART_NOT_FOUND);
    }

    /*
     * 4. Récupérer les articles avec
     *    le contexte produit/store
     */
    const cartItems =
      await this.cartItemRepository.findByCartIdWithProductContext(cart.id);

    if (cartItems.length === 0) {
      throw createAppError(Errors.CART_EMPTY);
    }

    /*
     * 5. Valider les articles
     */
    this.validateCartItems(cartItems);

    /*
     * 6. Récupérer le store
     */
    const storeId = cartItems[0].product_store_id;

    const store = await this.storeRepository.findById(storeId);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    if (store.status !== "active") {
      throw createAppError(Errors.STORE_INACTIVE);
    }

    /*
     * 7. Vérifier la devise plateforme
     */
    if (store.currency !== PLATFORM_CURRENCY) {
      throw createAppError(Errors.CURRENCY_MISMATCH);
    }

    /*
     * 8. Calcul serveur du total
     */
    const totalAmount = this.calculateTotal(cartItems);

    /*
     * 9. Générer la référence
     */
    const orderReference = generateOrderReference();

    /*
     * 10. Transaction atomique :
     *     commande + items + vidage panier
     */
    const order = await this.database.transaction(async (trx) => {
      const trxEventRepository = new EventRepository(trx);

      const trxOrderRepository = new OrderRepository(trx);

      const trxCartItemRepository = new CartItemRepository(trx);

      const createdOrder = await trxOrderRepository.create({
        reference: orderReference,

        idempotency_key: input.idempotencyKey,

        store_id: store.id,

        buyer_user_id: session.user_id,

        session_id: session.id,

        status: "pending",

        total_amount: totalAmount,

        currency: PLATFORM_CURRENCY,

        buyer_phone: input.buyerPhone,

        delivery_country: input.deliveryCountry,

        delivery_city: input.deliveryCity,

        delivery_address: input.deliveryAddress,
      });

      const orderItems = this.buildOrderItems(createdOrder.id, cartItems);

      await trxOrderRepository.createItems(orderItems);

      await trxEventRepository.create({
        event_name: "order.created",
        event_key: `order:${createdOrder.id}:created`,
        session_id: session.id,
        user_id: session.user_id,
        store_id: store.id,
        order_id: createdOrder.id,
        metadata: {
          source: "cart",
          item_count: orderItems.length,
          total_amount: totalAmount,
          currency: PLATFORM_CURRENCY,
        },
      });

      await this.notificationService.create(
        {
          user_id: store.owner_id,
          type: NotificationType.NEW_ORDER_FOR_SELLER,
          title: "Nouvelle commande",
          body: `Vous avez reçu une nouvelle commande ${createdOrder.reference}.`,
          data: {
            order_id: createdOrder.id,
            order_reference: createdOrder.reference,
            total_amount: totalAmount,
            currency: PLATFORM_CURRENCY,
          },
        },
        trx,
      );

      if (session.user_id) {
        await this.notificationService.create(
          {
            user_id: session.user_id,
            type: NotificationType.NEW_ORDER_FOR_BUYER,
            title: "Commande créée",
            body: `Votre commande ${createdOrder.reference} a été créée.`,
            data: {
              order_id: createdOrder.id,
              order_reference: createdOrder.reference,
              total_amount: totalAmount,
              currency: PLATFORM_CURRENCY,
            },
          },
          trx,
        );
      }

      await trxCartItemRepository.deleteByCartId(cart.id);

      return createdOrder;
    });

    /*
     * 11. Retourner la commande avec
     *     ses items
     */
    return this.buildOrderWithItems(order);
  }
}
