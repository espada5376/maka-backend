import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  ProductImageRepository,
} from "../../../src/database/repositories/product-image.repository";

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

describe("ProductImageRepository", () => {
  const imageRepository =
    new ProductImageRepository(db);

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

  async function createTestProduct() {
    const user = await userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name: "Image Owner",
    });

    const store = await storeRepository.create({
      owner_id: user.id,
      name: "Boutique Images",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const category =
      await categoryRepository.create({
        name: "Beauté",
        slug: `beaute-${Date.now()}`,
      });

    return productRepository.create({
      store_id: store.id,
      category_id: category.id,
      name: "Perruque",
      price: 45000,
    });
  }

  it("should create a product image", async () => {
    const product =
      await createTestProduct();

    const image =
      await imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/image-1.webp`,
        position: 0,
      });

    expect(image).toBeDefined();
    expect(image.id).toBeDefined();
    expect(image.product_id).toBe(product.id);
    expect(image.storage_key).toBe(
      `products/${product.id}/image-1.webp`,
    );
    expect(image.position).toBe(0);
    expect(image.created_at).toBeDefined();
  });

  it("should find an image by id", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/image.webp`,
        position: 0,
      });

    const image =
      await imageRepository.findById(
        created.id,
      );

    expect(image).toBeDefined();
    expect(image?.id).toBe(created.id);
    expect(image?.storage_key).toBe(
      created.storage_key,
    );
  });

  it("should find product images ordered by position", async () => {
    const product =
      await createTestProduct();

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-3.webp`,
      position: 2,
    });

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-1.webp`,
      position: 0,
    });

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-2.webp`,
      position: 1,
    });

    const images =
      await imageRepository.findByProductId(
        product.id,
      );

    expect(images).toHaveLength(3);

    expect(
      images.map((image) => image.position),
    ).toEqual([0, 1, 2]);

    expect(
      images.map((image) => image.storage_key),
    ).toEqual([
      `products/${product.id}/image-1.webp`,
      `products/${product.id}/image-2.webp`,
      `products/${product.id}/image-3.webp`,
    ]);
  });

  it("should update an image", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/old.webp`,
        position: 0,
      });

    const updated =
      await imageRepository.update(
        created.id,
        {
          position: 1,
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.id).toBe(created.id);
    expect(updated?.storage_key).toBe(
      created.storage_key,
    );
    expect(updated?.position).toBe(1);
  });

  it("should delete an image", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/image.webp`,
        position: 0,
      });

    const deleted =
      await imageRepository.delete(
        created.id,
      );

    expect(deleted).toBe(1);

    const image =
      await imageRepository.findById(
        created.id,
      );

    expect(image).toBeUndefined();
  });

  it("should delete all images of a product", async () => {
    const product =
      await createTestProduct();

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-1.webp`,
      position: 0,
    });

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-2.webp`,
      position: 1,
    });

    const deleted =
      await imageRepository.deleteByProductId(
        product.id,
      );

    expect(deleted).toBe(2);

    const images =
      await imageRepository.findByProductId(
        product.id,
      );

    expect(images).toHaveLength(0);
  });

  it("should reject duplicate positions for the same product", async () => {
    const product =
      await createTestProduct();

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product.id,
      storage_key:
        `products/${product.id}/image-1.webp`,
      position: 0,
    });

    await expect(
      imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/image-2.webp`,
        position: 0,
      }),
    ).rejects.toThrow();
  });

  it("should allow the same position for different products", async () => {
    const product1 =
      await createTestProduct();

    const product2 =
      await createTestProduct();

    await imageRepository.create({
      id: crypto.randomUUID(),
      product_id: product1.id,
      storage_key:
        `products/${product1.id}/image.webp`,
      position: 0,
    });

    await expect(
      imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product2.id,
        storage_key:
          `products/${product2.id}/image.webp`,
        position: 0,
      }),
    ).resolves.toBeDefined();
  });

  it("should reject an image for a nonexistent product", async () => {
    await expect(
      imageRepository.create({
        id: crypto.randomUUID(),
        product_id:
          "00000000-0000-0000-0000-000000000000",
        storage_key:
          "products/nonexistent/image.webp",
        position: 0,
      }),
    ).rejects.toThrow();
  });

  it("should cascade delete images when the product is deleted", async () => {
    const product =
      await createTestProduct();

    const image =
      await imageRepository.create({
        id: crypto.randomUUID(),
        product_id: product.id,
        storage_key:
          `products/${product.id}/image.webp`,
        position: 0,
      });

    await db("products")
      .where({ id: product.id })
      .del();

    const deletedImage =
      await imageRepository.findById(
        image.id,
      );

    expect(deletedImage).toBeUndefined();
  });

it("should reorder product images atomically", async () => {
  const product = await createTestProduct();

  const image1 = await imageRepository.create({
    id: crypto.randomUUID(),
    product_id: product.id,
    storage_key:
      `products/${product.id}/image-1.webp`,
    position: 0,
  });

  const image2 = await imageRepository.create({
    id: crypto.randomUUID(),
    product_id: product.id,
    storage_key:
      `products/${product.id}/image-2.webp`,
    position: 1,
  });

  const image3 = await imageRepository.create({
    id: crypto.randomUUID(),
    product_id: product.id,
    storage_key:
      `products/${product.id}/image-3.webp`,
    position: 2,
  });

  const result =
    await imageRepository.reorderPositions(
      product.id,
      [
        {
          id: image3.id,
          position: 0,
        },
        {
          id: image1.id,
          position: 1,
        },
        {
          id: image2.id,
          position: 2,
        },
      ],
    );

  expect(
    result.map((image) => image.id),
  ).toEqual([
    image3.id,
    image1.id,
    image2.id,
  ]);

  expect(
    result.map((image) => image.position),
  ).toEqual([
    0,
    1,
    2,
  ]);
});

});
