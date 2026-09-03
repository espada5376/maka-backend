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
        product_id: product.id,
        url: "https://example.com/image-1.jpg",
        position: 0,
      });

    expect(image).toBeDefined();
    expect(image.product_id).toBe(product.id);
    expect(image.url).toBe(
      "https://example.com/image-1.jpg",
    );
    expect(image.position).toBe(0);
  });

  it("should find an image by id", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        product_id: product.id,
        url: "https://example.com/image.jpg",
        position: 0,
      });

    const image =
      await imageRepository.findById(
        created.id,
      );

    expect(image).toBeDefined();
    expect(image?.id).toBe(created.id);
  });

  it("should find product images ordered by position", async () => {
    const product =
      await createTestProduct();

    await imageRepository.create({
      product_id: product.id,
      url: "https://example.com/image-3.jpg",
      position: 2,
    });

    await imageRepository.create({
      product_id: product.id,
      url: "https://example.com/image-1.jpg",
      position: 0,
    });

    await imageRepository.create({
      product_id: product.id,
      url: "https://example.com/image-2.jpg",
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
  });

  it("should update an image", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        product_id: product.id,
        url: "https://example.com/old.jpg",
        position: 0,
      });

    const updated =
      await imageRepository.update(
        created.id,
        {
          url: "https://example.com/new.jpg",
          position: 1,
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.url).toBe(
      "https://example.com/new.jpg",
    );
    expect(updated?.position).toBe(1);
  });

  it("should delete an image", async () => {
    const product =
      await createTestProduct();

    const created =
      await imageRepository.create({
        product_id: product.id,
        url: "https://example.com/image.jpg",
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
      product_id: product.id,
      url: "https://example.com/image-1.jpg",
      position: 0,
    });

    await imageRepository.create({
      product_id: product.id,
      url: "https://example.com/image-2.jpg",
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

  it("should reject an image with a negative position", async () => {
    const product =
      await createTestProduct();

    await expect(
      imageRepository.create({
        product_id: product.id,
        url: "https://example.com/image.jpg",
        position: -1,
      }),
    ).rejects.toThrow();
  });

  it("should reject an image for a nonexistent product", async () => {
    await expect(
      imageRepository.create({
        product_id:
          "00000000-0000-0000-0000-000000000000",
        url: "https://example.com/image.jpg",
        position: 0,
      }),
    ).rejects.toThrow();
  });

  it("should cascade delete images when the product is deleted", async () => {
    const product =
      await createTestProduct();

    const image =
      await imageRepository.create({
        product_id: product.id,
        url: "https://example.com/image.jpg",
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
});
