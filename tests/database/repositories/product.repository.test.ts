import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

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

describe("ProductRepository", () => {
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

  async function createStoreAndCategory() {
    const user = await userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name: "Product Owner",
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
        slug: `beaute-${Date.now()}`,
      });

    return {
      user,
      store,
      category,
    };
  }

  it("should create a product", async () => {
    const { store, category } =
      await createStoreAndCategory();

    const product =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Perruque naturelle",
        description: "Perruque de qualité",
        price: 45000,
      });

    expect(product).toBeDefined();
    expect(product.store_id).toBe(store.id);
    expect(product.category_id).toBe(category.id);
    expect(product.name).toBe(
      "Perruque naturelle",
    );
    expect(product.description).toBe(
      "Perruque de qualité",
    );
    expect(product.price).toBe("45000.00");
    expect(product.availability).toBe("available");
    expect(product.status).toBe("active");
  });

  it("should find a product by id", async () => {
    const { store, category } =
      await createStoreAndCategory();

    const created =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit Test",
        price: 10000,
      });

    const product =
      await productRepository.findById(
        created.id,
      );

    expect(product).toBeDefined();
    expect(product?.id).toBe(created.id);
  });

  it("should find only available active products by id", async () => {
  const { store, category } = await createStoreAndCategory();

  const available = await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Disponible",
    price: 10000,
  });

  const unavailable = await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Indisponible",
    price: 20000,
    availability: "unavailable",
  });

  const archived = await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Archivé",
    price: 30000,
    status: "archived",
  });

  expect(
    await productRepository.findAvailableById(available.id),
  ).toBeDefined();

  expect(
    await productRepository.findAvailableById(unavailable.id),
  ).toBeUndefined();

  expect(
    await productRepository.findAvailableById(archived.id),
  ).toBeUndefined();
});


  it("should find products by store", async () => {
    const { store, category } =
      await createStoreAndCategory();

    await productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Produit 1",
      price: 10000,
    });

    await productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Produit 2",
      price: 20000,
    });

    const products =
      await productRepository.findByStoreId(
        store.id,
      );

    expect(products).toHaveLength(2);
  });

  it("should find only available active products by category", async () => {
  const { store, category } = await createStoreAndCategory();

  await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Disponible",
    price: 10000,
    availability: "available",
  });

  await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Indisponible",
    price: 20000,
    availability: "unavailable",
  });

  await productRepository.create({
    store_id: store.id,
    category_id: category.id,
    name: "Archivé",
    price: 30000,
    status: "archived",
  });

  const products = await productRepository.findByCategoryId(category.id);

  expect(products).toHaveLength(1);
  expect(products[0].name).toBe("Disponible");
});

  it("should find only available active products by store", async () => {
    const { store, category } =
      await createStoreAndCategory();

    await productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Disponible",
      price: 10000,
      availability: "available",
    });

    await productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Indisponible",
      price: 20000,
      availability: "unavailable",
    });

    await productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Archivé",
      price: 30000,
      status: "archived",
    });

    const products =
      await productRepository.findAvailableByStoreId(
        store.id,
      );

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe(
      "Disponible",
    );
  });

  it("should update a product", async () => {
    const { store, category } =
      await createStoreAndCategory();

    const created =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Ancien nom",
        price: 10000,
      });

    const updated =
      await productRepository.update(
        created.id,
        {
          name: "Nouveau nom",
          price: 15000,
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.name).toBe(
      "Nouveau nom",
    );
    expect(updated?.price).toBe("15000.00");
  });

  it("should change product availability", async () => {
    const { store, category } =
      await createStoreAndCategory();

    const created =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit",
        price: 10000,
      });

    const updated =
      await productRepository.setAvailability(
        created.id,
        "unavailable",
      );

    expect(updated?.availability).toBe(
      "unavailable",
    );
  });

  it("should archive a product", async () => {
    const { store, category } =
      await createStoreAndCategory();

    const created =
      await productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit",
        price: 10000,
      });

    const updated =
      await productRepository.setStatus(
        created.id,
        "archived",
      );

    expect(updated?.status).toBe("archived");
  });

  it("should reject a zero price", async () => {
    const { store, category } =
      await createStoreAndCategory();

    await expect(
      productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit gratuit",
        price: 0,
      }),
    ).rejects.toThrow();
  });

  it("should reject a negative price", async () => {
    const { store, category } =
      await createStoreAndCategory();

    await expect(
      productRepository.create({
        store_id: store.id,
        category_id: category.id,
        name: "Produit invalide",
        price: -500,
      }),
    ).rejects.toThrow();
  });

  it("should reject an invalid store", async () => {
    const { category } =
      await createStoreAndCategory();

    await expect(
      productRepository.create({
        store_id:
          "00000000-0000-0000-0000-000000000000",
        category_id: category.id,
        name: "Produit",
        price: 10000,
      }),
    ).rejects.toThrow();
  });

  it("should reject an invalid category", async () => {
    const { store } =
      await createStoreAndCategory();

    await expect(
      productRepository.create({
        store_id: store.id,
        category_id:
          "00000000-0000-0000-0000-000000000000",
        name: "Produit",
        price: 10000,
      }),
    ).rejects.toThrow();
  });
});
