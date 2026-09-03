import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  EventRepository,
} from "../../../src/database/repositories/event.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import {
  StoreRepository,
} from "../../../src/database/repositories/store.repository";

import {
  CategoryRepository,
} from "../../../src/database/repositories/category.repository";

import {
  ProductRepository,
} from "../../../src/database/repositories/product.repository";

import { cleanDatabase } from "../../helpers/database";

describe("EventRepository", () => {
  const eventRepository =
    new EventRepository(db);

  const userRepository =
    new UserRepository(db);

  const storeRepository =
    new StoreRepository(db);

  const categoryRepository =
    new CategoryRepository(db);

  const productRepository =
    new ProductRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createSession() {
    const user =
      await userRepository.create({
        phone: `9${Date.now()}${Math.floor(
          Math.random() * 1000,
        )}`,
        name: "Event User",
      });

    const [session] =
      await db("sessions")
        .insert({
          user_id: user.id,
          expires_at: new Date(
            Date.now() +
              24 * 60 * 60 * 1000,
          ),
        })
        .returning("*");

    return {
      user,
      session,
    };
  }

  async function createStoreAndProduct() {
    const user =
      await userRepository.create({
        phone: `9${Date.now()}${Math.floor(
          Math.random() * 1000,
        )}`,
        name: "Store Owner",
      });

    const store =
      await storeRepository.create({
        owner_id: user.id,
        name: "Ma Boutique",
        country: "TG",
        city: "Lomé",
        currency: "XOF",
      });

    const category =
      await categoryRepository.create({
        name: "Beauté",
        slug: `beaute-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
      });

    const product =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Perruque naturelle",
        price: 45000,
      });

    return {
      user,
      store,
      category,
      product,
    };
  }

  async function createOrder(
    storeId: string,
    sessionId: string,
    buyerUserId: string | null = null,
  ) {
    const [order] =
      await db("orders")
        .insert({
          reference: `ORD-${Date.now()}`,
          idempotency_key: `idem-${Date.now()}-${Math.floor(
            Math.random() * 1000,
          )}`,
          store_id: storeId,
          buyer_user_id: buyerUserId,
          session_id: sessionId,
          total_amount: 45000,
          currency: "XOF",
          buyer_phone: "90123456",
          delivery_country: "TG",
          delivery_city: "Lomé",
          delivery_address: "Adresse de livraison",
        })
        .returning("*");

    return order;
  }

  it("should create an event", async () => {
    const event =
      await eventRepository.create({
        event_name: "product_viewed",
      });

    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.event_name).toBe(
      "product_viewed",
    );
    expect(event.event_key).toBeNull();
    expect(event.session_id).toBeNull();
    expect(event.user_id).toBeNull();
    expect(event.store_id).toBeNull();
    expect(event.product_id).toBeNull();
    expect(event.order_id).toBeNull();
    expect(event.metadata).toEqual({});
    expect(event.occurred_at).toBeDefined();
  });

  it("should create an event with all relations", async () => {
    const { user, session } =
      await createSession();

    const {
      store,
      product,
    } =
      await createStoreAndProduct();

    const order =
      await createOrder(
        store.id,
        session.id,
        user.id,
      );

    const event =
      await eventRepository.create({
        event_name: "order_created",
        event_key: `order-created-${order.id}`,
        session_id: session.id,
        user_id: user.id,
        store_id: store.id,
        product_id: product.id,
        order_id: order.id,
        metadata: {
          source: "checkout",
          quantity: 2,
          test: true,
        },
      });

    expect(event.event_name).toBe(
      "order_created",
    );
    expect(event.event_key).toBe(
      `order-created-${order.id}`,
    );
    expect(event.session_id).toBe(
      session.id,
    );
    expect(event.user_id).toBe(user.id);
    expect(event.store_id).toBe(store.id);
    expect(event.product_id).toBe(
      product.id,
    );
    expect(event.order_id).toBe(
      order.id,
    );
    expect(event.metadata).toEqual({
      source: "checkout",
      quantity: 2,
      test: true,
    });
  });

  it("should create an anonymous event", async () => {
    const [session] =
      await db("sessions")
        .insert({
          user_id: null,
          expires_at: new Date(
            Date.now() +
              24 * 60 * 60 * 1000,
          ),
        })
        .returning("*");

    const event =
      await eventRepository.create({
        event_name: "product_viewed",
        session_id: session.id,
      });

    expect(event.session_id).toBe(
      session.id,
    );
    expect(event.user_id).toBeNull();
  });

  it("should find an event by id", async () => {
    const created =
      await eventRepository.create({
        event_name: "product_viewed",
      });

    const event =
      await eventRepository.findById(
        created.id,
      );

    expect(event).toBeDefined();
    expect(event?.id).toBe(created.id);
  });

  it("should return undefined for an unknown id", async () => {
    const event =
      await eventRepository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(event).toBeUndefined();
  });

  it("should find an event by event key", async () => {
    const eventKey =
      "product-viewed-test-key";

    const created =
      await eventRepository.create({
        event_name: "product_viewed",
        event_key: eventKey,
      });

    const event =
      await eventRepository.findByEventKey(
        eventKey,
      );

    expect(event).toBeDefined();
    expect(event?.id).toBe(created.id);
    expect(event?.event_key).toBe(
      eventKey,
    );
  });

  it("should reject duplicate event keys", async () => {
    const eventKey =
      "duplicate-event-key";

    await eventRepository.create({
      event_name: "first_event",
      event_key: eventKey,
    });

    await expect(
      eventRepository.create({
        event_name: "second_event",
        event_key: eventKey,
      }),
    ).rejects.toThrow();
  });

  it("should allow multiple events without an event key", async () => {
    const first =
      await eventRepository.create({
        event_name: "product_viewed",
      });

    const second =
      await eventRepository.create({
        event_name: "product_viewed",
      });

    expect(first.id).not.toBe(
      second.id,
    );
    expect(first.event_key).toBeNull();
    expect(second.event_key).toBeNull();
  });

  it("should find events by session id", async () => {
    const { session } =
      await createSession();

    await eventRepository.create({
      event_name: "first_event",
      session_id: session.id,
    });

    await eventRepository.create({
      event_name: "second_event",
      session_id: session.id,
    });

    const events =
      await eventRepository.findBySessionId(
        session.id,
      );

    expect(events).toHaveLength(2);
    expect(
      events.every(
        (event) =>
          event.session_id ===
          session.id,
      ),
    ).toBe(true);
  });

  it("should find events by user id", async () => {
    const { user } =
      await createSession();

    await eventRepository.create({
      event_name: "profile_viewed",
      user_id: user.id,
    });

    const events =
      await eventRepository.findByUserId(
        user.id,
      );

    expect(events).toHaveLength(1);
    expect(events[0].user_id).toBe(
      user.id,
    );
  });

  it("should find events by store id", async () => {
    const { store } =
      await createStoreAndProduct();

    await eventRepository.create({
      event_name: "product_created",
      store_id: store.id,
    });

    const events =
      await eventRepository.findByStoreId(
        store.id,
      );

    expect(events).toHaveLength(1);
    expect(events[0].store_id).toBe(
      store.id,
    );
  });

  it("should find events by product id", async () => {
    const { product } =
      await createStoreAndProduct();

    await eventRepository.create({
      event_name: "product_viewed",
      product_id: product.id,
    });

    const events =
      await eventRepository.findByProductId(
        product.id,
      );

    expect(events).toHaveLength(1);
    expect(events[0].product_id).toBe(
      product.id,
    );
  });

  it("should find events by order id", async () => {
    const { user, session } =
      await createSession();

    const { store } =
      await createStoreAndProduct();

    const order =
      await createOrder(
        store.id,
        session.id,
        user.id,
      );

    await eventRepository.create({
      event_name: "order_created",
      order_id: order.id,
    });

    const events =
      await eventRepository.findByOrderId(
        order.id,
      );

    expect(events).toHaveLength(1);
    expect(events[0].order_id).toBe(
      order.id,
    );
  });

  it("should order session events by occurred_at descending", async () => {
    const { session } =
      await createSession();

    const older =
      await eventRepository.create({
        event_name: "older_event",
        session_id: session.id,
        occurred_at: new Date(
          "2026-01-01T10:00:00Z",
        ),
      });

    const newer =
      await eventRepository.create({
        event_name: "newer_event",
        session_id: session.id,
        occurred_at: new Date(
          "2026-01-02T10:00:00Z",
        ),
      });

    const events =
      await eventRepository.findBySessionId(
        session.id,
      );

    expect(events).toHaveLength(2);
    expect(events[0].id).toBe(
      newer.id,
    );
    expect(events[1].id).toBe(
      older.id,
    );
  });

  it("should preserve event metadata", async () => {
    const metadata = {
      source: "homepage",
      product_id: "abc",
      nested: {
        value: 42,
      },
      tags: [
        "landing-page",
        "catalog",
      ],
    };

    const event =
      await eventRepository.create({
        event_name: "product_viewed",
        metadata,
      });

    expect(event.metadata).toEqual(
      metadata,
    );
  });

  it("should allow a custom occurred_at timestamp", async () => {
    const occurredAt =
      new Date(
        "2026-01-15T12:30:00Z",
      );

    const event =
      await eventRepository.create({
        event_name: "historical_event",
        occurred_at: occurredAt,
      });

    expect(
      new Date(
        event.occurred_at,
      ).toISOString(),
    ).toBe(
      occurredAt.toISOString(),
    );
  });

  it("should reject an event with a nonexistent session", async () => {
    await expect(
      eventRepository.create({
        event_name: "session_event",
        session_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should reject an event with a nonexistent user", async () => {
    await expect(
      eventRepository.create({
        event_name: "user_event",
        user_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should reject an event with a nonexistent store", async () => {
    await expect(
      eventRepository.create({
        event_name: "store_event",
        store_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should reject an event with a nonexistent product", async () => {
    await expect(
      eventRepository.create({
        event_name: "product_event",
        product_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should reject an event with a nonexistent order", async () => {
    await expect(
      eventRepository.create({
        event_name: "order_event",
        order_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should set session_id to null when the session is deleted", async () => {
    const { session } =
      await createSession();

    const event =
      await eventRepository.create({
        event_name: "session_event",
        session_id: session.id,
      });

    await db("sessions")
      .where({ id: session.id })
      .del();

    const updated =
      await eventRepository.findById(
        event.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.session_id).toBeNull();
  });

  it("should set user_id to null when the user is deleted", async () => {
    const { user } =
      await createSession();

    const event =
      await eventRepository.create({
        event_name: "user_event",
        user_id: user.id,
      });

    await db("users")
      .where({ id: user.id })
      .del();

    const updated =
      await eventRepository.findById(
        event.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.user_id).toBeNull();
  });

  it("should set store_id to null when the store is deleted", async () => {
    const {
      user,
      store,
    } =
      await createStoreAndProduct();

    const event =
      await eventRepository.create({
        event_name: "store_event",
        store_id: store.id,
      });

    /*
     * products reference the store with RESTRICT,
     * so remove dependent products first.
     */
    await db("products")
      .where({
        store_id: store.id,
      })
      .del();

    await db("stores")
      .where({ id: store.id })
      .del();

    const updated =
      await eventRepository.findById(
        event.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.store_id).toBeNull();

    expect(user).toBeDefined();
  });

  it("should set product_id to null when the product is deleted", async () => {
    const { product } =
      await createStoreAndProduct();

    const event =
      await eventRepository.create({
        event_name: "product_event",
        product_id: product.id,
      });

    await db("products")
      .where({ id: product.id })
      .del();

    const updated =
      await eventRepository.findById(
        event.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.product_id).toBeNull();
  });

  it("should set order_id to null when the order is deleted", async () => {
    const { user, session } =
      await createSession();

    const { store } =
      await createStoreAndProduct();

    const order =
      await createOrder(
        store.id,
        session.id,
        user.id,
      );

    const event =
      await eventRepository.create({
        event_name: "order_event",
        order_id: order.id,
      });

    await db("orders")
      .where({ id: order.id })
      .del();

    const updated =
      await eventRepository.findById(
        event.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.order_id).toBeNull();
  });
});
