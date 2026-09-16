import {
beforeAll,
beforeEach,
describe,
expect,
it,
} from "vitest";

import db from "../../../src/database/knex";

import {
OrderRepository,
} from "../../../src/database/repositories/order.repository";

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

describe("OrderRepository", () => {
const orderRepository =
new OrderRepository(db);

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

async function createUser() {
return userRepository.create({
phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
name: "Order Test User",
});
}

async function createSession(
userId: string | null = null,
) {
const [session] = await db("sessions")
.insert({
user_id: userId,
expires_at: new Date(
Date.now() + 24 * 60 * 60 * 1000,
),
})
.returning("*");


return session;


}

async function createStore() {
const user = await createUser();


const store =
  await storeRepository.create({
    owner_id: user.id,
    name: "Ma Boutique",
    country: "TG",
    city: "Lomé",
    currency: "XOF",
  });

return {
  user,
  store,
};


}

async function createProduct(
storeId?: string,
) {
let store;


if (storeId) {
  store =
    await storeRepository.findById(
      storeId,
    );

  if (!store) {
    throw new Error(
      "Store not found.",
    );
  }
} else {
  const created =
    await createStore();

  store = created.store;
}

const category =
  await categoryRepository.create({
    name: "Beauté",
    slug: `beaute-${Date.now()}-${Math.random()}`,
  });

const product =
  await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Perruque naturelle",
    price: 45000,
  });

return {
  store,
  category,
  product,
};


}

async function createOrderData() {
const user = await createUser();


const session =
  await createSession(user.id);

const { store, product } =
  await createProduct();

return {
  user,
  session,
  store,
  product,
};


}

async function createOrder(
storeId?: string,
) {
const user = await createUser();


const session =
  await createSession(user.id);

let store;
let product;

if (storeId) {
  const result =
    await createProduct(storeId);

  store = result.store;
  product = result.product;
} else {
  const result =
    await createProduct();

  store = result.store;
  product = result.product;
}

const order =
  await orderRepository.create({
    reference: `MK-${Date.now()}-${Math.floor(
      Math.random() * 1000,
    )}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 90000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  });

return {
  order,
  user,
  session,
  store,
  product,
};


}

it("should create an order", async () => {
const {
user,
session,
store,
} = await createOrderData();


const order =
  await orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 90000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  });

expect(order).toBeDefined();
expect(order.id).toBeDefined();
expect(order.reference).toBeDefined();
expect(order.store_id).toBe(store.id);
expect(order.buyer_user_id).toBe(user.id);
expect(order.session_id).toBe(session.id);
expect(order.status).toBe("pending");
expect(order.total_amount).toBe("90000.00");
expect(order.currency).toBe("XOF");
expect(order.buyer_phone).toBe(user.phone);
expect(order.delivery_country).toBe("TG");
expect(order.delivery_city).toBe("Lomé");
expect(order.delivery_address).toBe("Tokoin");


});

it("should create an order for an anonymous buyer", async () => {
const { store } =
await createOrderData();


const anonymousSession =
  await createSession(null);

const order =
  await orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: null,
    session_id: anonymousSession.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: "90123456",
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Bè",
  });

expect(order.buyer_user_id).toBeNull();

expect(order.session_id).toBe(
  anonymousSession.id,
);


});

it("should find an order by id", async () => {
const { order } =
await createOrder();


const found =
  await orderRepository.findById(
    order.id,
  );

expect(found).toBeDefined();
expect(found?.id).toBe(order.id);

});

it("should return undefined for an unknown id", async () => {
const found =
await orderRepository.findById(
"00000000-0000-0000-0000-000000000000",
);

expect(found).toBeUndefined();


});

it("should find an order by reference", async () => {
const { order } =
await createOrder();


const found =
  await orderRepository.findByReference(
    order.reference,
  );

expect(found).toBeDefined();
expect(found?.id).toBe(order.id);


});

it("should find an order by idempotency key", async () => {
const { order } =
await createOrder();


const found =
  await orderRepository.findByIdempotencyKey(
    order.idempotency_key,
  );

expect(found).toBeDefined();
expect(found?.id).toBe(order.id);


});

it("should find orders by session id", async () => {
const {
user,
session,
store,
} = await createOrderData();


const first =
  await orderRepository.create({
    reference: `MK-${Date.now()}-1`,
    idempotency_key:
      `idem-${Date.now()}-1`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  });

const second =
  await orderRepository.create({
    reference: `MK-${Date.now()}-2`,
    idempotency_key:
      `idem-${Date.now()}-2`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 90000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  });

const orders =
  await orderRepository.findBySessionId(
    session.id,
  );

expect(orders).toHaveLength(2);

expect(
  orders.map((order) => order.id),
).toContain(first.id);

expect(
  orders.map((order) => order.id),
).toContain(second.id);


});

it("should find orders by buyer user id", async () => {
const {
user,
session,
store,
} = await createOrderData();


await orderRepository.create({
  reference: `MK-${Date.now()}-1`,
  idempotency_key:
    `idem-${Date.now()}-1`,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 45000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

await orderRepository.create({
  reference: `MK-${Date.now()}-2`,
  idempotency_key:
    `idem-${Date.now()}-2`,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 90000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

const orders =
  await orderRepository.findByBuyerUserId(
    user.id,
  );

expect(orders).toHaveLength(2);


});

it("should find orders by store id", async () => {
const {
store,
user,
session,
} = await createOrderData();


await orderRepository.create({
  reference: `MK-${Date.now()}-1`,
  idempotency_key:
    `idem-${Date.now()}-1`,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 45000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

await orderRepository.create({
  reference: `MK-${Date.now()}-2`,
  idempotency_key:
    `idem-${Date.now()}-2`,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 90000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

const orders =
  await orderRepository.findByStoreId(
    store.id,
  );

expect(orders).toHaveLength(2);


});

it("should update an order status", async () => {
const { order } =
await createOrder();


const updated =
  await orderRepository.updateStatus(
    order.id,
    "confirmed",
  );

expect(updated).toBeDefined();

expect(updated?.status).toBe(
  "confirmed",
);


});

it("should create an order item", async () => {
const { order, product } =
await createOrder();


const item =
  await orderRepository.createItem({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    unit_price: 45000,
    quantity: 2,
    subtotal: 90000,
  });

expect(item).toBeDefined();
expect(item.order_id).toBe(order.id);
expect(item.product_id).toBe(product.id);

expect(item.product_name).toBe(
  "Perruque naturelle",
);

expect(item.unit_price).toBe(
  "45000.00",
);

expect(item.quantity).toBe(2);

expect(item.subtotal).toBe(
  "90000.00",
);


});

it("should create multiple order items", async () => {
const { order, product } =
await createOrder();


const items =
  await orderRepository.createItems([
    {
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      unit_price: 45000,
      quantity: 2,
      subtotal: 90000,
    },
    {
      order_id: order.id,
      product_id: product.id,
      product_name: "Deuxième produit",
      unit_price: 10000,
      quantity: 1,
      subtotal: 10000,
    },
  ]);

expect(items).toHaveLength(2);


});

it("should return an empty array when creating no order items", async () => {
const items =
await orderRepository.createItems([]);

expect(items).toEqual([]);


});

it("should find order items", async () => {
const { order, product } =
await createOrder();


await orderRepository.createItem({
  order_id: order.id,
  product_id: product.id,
  product_name: product.name,
  unit_price: 45000,
  quantity: 2,
  subtotal: 90000,
});

const items =
  await orderRepository.findItems(
    order.id,
  );

expect(items).toHaveLength(1);

expect(items[0].order_id).toBe(
  order.id,
);

expect(items[0].product_id).toBe(
  product.id,
);


});

it("should reject duplicate order references", async () => {
const {
user,
session,
store,
} = await createOrderData();


const reference =
  `MK-${Date.now()}`;

await orderRepository.create({
  reference,
  idempotency_key:
    `idem-${Date.now()}-1`,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 45000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

await expect(
  orderRepository.create({
    reference,
    idempotency_key:
      `idem-${Date.now()}-2`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject duplicate idempotency keys", async () => {
const {
user,
session,
store,
} = await createOrderData();


const idempotencyKey =
  `idem-${Date.now()}`;

await orderRepository.create({
  reference: `MK-${Date.now()}-1`,
  idempotency_key: idempotencyKey,
  store_id: store.id,
  buyer_user_id: user.id,
  session_id: session.id,
  total_amount: 45000,
  currency: "XOF",
  buyer_phone: user.phone,
  delivery_country: "TG",
  delivery_city: "Lomé",
  delivery_address: "Tokoin",
});

await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}-2`,
    idempotency_key: idempotencyKey,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an order with a nonexistent store", async () => {
const user = await createUser();


const session =
  await createSession(user.id);

await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id:
      "00000000-0000-0000-0000-000000000000",
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an order with a nonexistent session", async () => {
const { user, store } =
await createStore();


await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id:
      "00000000-0000-0000-0000-000000000000",
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an order with a nonexistent buyer", async () => {
const {
session,
store,
} = await createOrderData();


await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id:
      "00000000-0000-0000-0000-000000000000",
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: "90123456",
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an invalid total amount", async () => {
const {
user,
session,
store,
} = await createOrderData();


await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: -1,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an invalid order status", async () => {
const {
user,
session,
store,
} = await createOrderData();


await expect(
  db("orders").insert({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    status: "invalid_status",
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an invalid currency code", async () => {
const {
user,
session,
store,
} = await createOrderData();


await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "X",
    buyer_phone: user.phone,
    delivery_country: "TG",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an invalid delivery country code", async () => {
const {
user,
session,
store,
} = await createOrderData();


await expect(
  orderRepository.create({
    reference: `MK-${Date.now()}`,
    idempotency_key:
      `idem-${Date.now()}-${Math.random()}`,
    store_id: store.id,
    buyer_user_id: user.id,
    session_id: session.id,
    total_amount: 45000,
    currency: "XOF",
    buyer_phone: user.phone,
    delivery_country: "T",
    delivery_city: "Lomé",
    delivery_address: "Tokoin",
  }),
).rejects.toThrow();


});

it("should reject an order item with a nonexistent order", async () => {
const { product } =
await createProduct();


await expect(
  orderRepository.createItem({
    order_id:
      "00000000-0000-0000-0000-000000000000",
    product_id: product.id,
    product_name: product.name,
    unit_price: 45000,
    quantity: 1,
    subtotal: 45000,
  }),
).rejects.toThrow();


});

it("should reject an order item with a nonexistent product", async () => {
const { order } =
await createOrder();


await expect(
  orderRepository.createItem({
    order_id: order.id,
    product_id:
      "00000000-0000-0000-0000-000000000000",
    product_name: "Produit inexistant",
    unit_price: 45000,
    quantity: 1,
    subtotal: 45000,
  }),
).rejects.toThrow();


});

it("should reject an order item with an invalid quantity", async () => {
const { order, product } =
await createOrder();


await expect(
  orderRepository.createItem({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    unit_price: 45000,
    quantity: 0,
    subtotal: 0,
  }),
).rejects.toThrow();


});

it("should reject an order item with an invalid unit price", async () => {
const { order, product } =
await createOrder();


await expect(
  orderRepository.createItem({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    unit_price: 0,
    quantity: 1,
    subtotal: 0,
  }),
).rejects.toThrow();


});

it("should reject an order item with an invalid subtotal", async () => {
const { order, product } =
await createOrder();


await expect(
  orderRepository.createItem({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    unit_price: 45000,
    quantity: 1,
    subtotal: 0,
  }),
).rejects.toThrow();


});

it("should cascade delete order items when the order is deleted", async () => {
const { order, product } =
await createOrder();


await orderRepository.createItem({
  order_id: order.id,
  product_id: product.id,
  product_name: product.name,
  unit_price: 45000,
  quantity: 1,
  subtotal: 45000,
});

await db("orders")
  .where({
    id: order.id,
  })
  .del();

const items =
  await db("order_items")
    .where({
      order_id: order.id,
    });

expect(items).toHaveLength(0);


});

describe("findItemsByProductId", () => {
it("should return all order items for a product", async () => {
const { store } =
await createStore();


  const productA =
    await createProduct(store.id);

  const productB =
    await createProduct(store.id);

  const orderA =
    await createOrder(store.id);

  const orderB =
    await createOrder(store.id);

  await orderRepository.createItem({
    order_id: orderA.order.id,
    product_id: productA.product.id,
    product_name: "Product A",
    unit_price: 1000,
    quantity: 2,
    subtotal: 2000,
  });

  await orderRepository.createItem({
    order_id: orderB.order.id,
    product_id: productA.product.id,
    product_name: "Product A",
    unit_price: 1000,
    quantity: 1,
    subtotal: 1000,
  });

  await orderRepository.createItem({
    order_id: orderA.order.id,
    product_id: productB.product.id,
    product_name: "Product B",
    unit_price: 2000,
    quantity: 1,
    subtotal: 2000,
  });

  const items =
    await orderRepository.findItemsByProductId(
      productA.product.id,
    );

  expect(items).toHaveLength(2);

  expect(
    items.every(
      (item) =>
        item.product_id ===
        productA.product.id,
    ),
  ).toBe(true);
});

it("should return an empty array when the product has no order items", async () => {
  const { store } =
    await createStore();

  const { product } =
    await createProduct(store.id);

  const items =
    await orderRepository.findItemsByProductId(
      product.id,
    );

  expect(items).toEqual([]);
});


});

describe("findItemsByStoreId", () => {
it("should return all order items belonging to a store", async () => {
const { store: storeA } =
await createStore();

  const { store: storeB } =
    await createStore();

  const productA =
    await createProduct(storeA.id);

  const productB =
    await createProduct(storeB.id);

  const orderA =
    await createOrder(storeA.id);

  const orderB =
    await createOrder(storeB.id);

  await orderRepository.createItem({
    order_id: orderA.order.id,
    product_id: productA.product.id,
    product_name: "Product A",
    unit_price: 1000,
    quantity: 2,
    subtotal: 2000,
  });

  await orderRepository.createItem({
    order_id: orderB.order.id,
    product_id: productB.product.id,
    product_name: "Product B",
    unit_price: 2000,
    quantity: 1,
    subtotal: 2000,
  });

  const items =
    await orderRepository.findItemsByStoreId(
      storeA.id,
    );

  expect(items).toHaveLength(1);

  expect(items[0].product_id).toBe(
    productA.product.id,
  );

  expect(items[0].order_id).toBe(
    orderA.order.id,
  );
});

it("should return an empty array when the store has no orders", async () => {
  const { store } =
    await createStore();

  const items =
    await orderRepository.findItemsByStoreId(
      store.id,
    );

  expect(items).toEqual([]);
});

});
});
