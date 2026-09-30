import { Knex } from "knex";
import db from "../database/knex.js";

import {
  Product,
  ProductAvailability,
  ProductRepository,
} from "../database/repositories/product.repository.js";

import { SessionRepository } from "../database/repositories/session.repository.js";
import { StoreRepository } from "../database/repositories/store.repository.js";
import { CategoryRepository } from "../database/repositories/category.repository.js";
import { EventRepository } from "../database/repositories/event.repository.js";

import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";

export interface CreateProductInput {
  category_id: string;
  name: string;
  description?: string | null;
  price: number;
}

export interface UpdateProductInput {
  category_id?: string;
  name?: string;
  description?: string | null;
  price?: number;
}

export interface IProductService {
  create(
    sessionId: string,
    input: CreateProductInput,
  ): Promise<Product>;

  getById(productId: string): Promise<Product>;

  getByStore(storeId: string): Promise<Product[]>;

  getByCategory(categoryId: string): Promise<Product[]>;

  getAvailableByStore(storeId: string): Promise<Product[]>;

  update(
    sessionId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Product>;

  setAvailability(
    sessionId: string,
    productId: string,
    availability: ProductAvailability,
  ): Promise<Product>;

  archive(
    sessionId: string,
    productId: string,
  ): Promise<Product>;

  unarchive(
    sessionId: string,
    productId: string,
  ): Promise<Product>;
}

export class ProductService implements IProductService {
  constructor(
    private readonly database: Knex = db,
    private readonly productRepository = new ProductRepository(database),
    private readonly sessionRepository = new SessionRepository(database),
    private readonly storeRepository = new StoreRepository(database),
    private readonly categoryRepository = new CategoryRepository(database),
  ) {}

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async getAuthenticatedSession(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw createAppError(Errors.SESSION_NOT_FOUND);
    }

    if (session.expires_at <= new Date()) {
      throw createAppError(Errors.SESSION_EXPIRED);
    }

    if (!session.user_id) {
      throw createAppError(Errors.PRODUCT_FORBIDDEN);
    }

    return session;
  }

  private validateName(name: string): string {
    const normalizedName = name.trim();

    if (
      normalizedName.length === 0 ||
      normalizedName.length > 150
    ) {
      throw createAppError(Errors.INVALID_PRODUCT);
    }

    return normalizedName;
  }

  private validatePrice(price: number): number {
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw createAppError(Errors.INVALID_PRODUCT);
    }

    return price;
  }

  private async getOwnedProduct(
  productId: string,
  userId: string,
  ) {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw createAppError(Errors.PRODUCT_NOT_FOUND);
    }

    const store = await this.storeRepository.findById(
      product.store_id,
    );

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    if (store.owner_id !== userId) {
      throw createAppError(Errors.PRODUCT_FORBIDDEN);
    }

    return {
      product,
      store,
    };
  }

  private assertActiveStore(
    store: NonNullable<
      Awaited<ReturnType<StoreRepository["findById"]>>
    >,
  ): void {
    if (store.status !== "active") {
      throw createAppError(Errors.STORE_INACTIVE);
    }
  }

  private async validateCategory(categoryId: string) {
    const category =
      await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw createAppError(Errors.CATEGORY_NOT_FOUND);
    }

    if (category.status !== "active") {
      throw createAppError(Errors.CATEGORY_INACTIVE);
    }

    return category;
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    sessionId: string,
    input: CreateProductInput,
  ): Promise<Product> {
    const session =
      await this.getAuthenticatedSession(sessionId);

    const store = await this.storeRepository.findByOwnerId(
      session.user_id!,
    );

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    this.assertActiveStore(store);

    const category = await this.validateCategory(
      input.category_id,
    );

    const name = this.validateName(input.name);
    const price = this.validatePrice(input.price);

    return this.database.transaction(async (trx) => {
      const trxProductRepository =
        new ProductRepository(trx);

      const trxEventRepository =
        new EventRepository(trx);

      const product =
        await trxProductRepository.create({
          store_id: store.id,
          category_id: category.id,
          name,
          description: input.description ?? null,
          price,
          availability: "available",
          status: "active",
        });

      await trxEventRepository.create({
        event_name: "product.created",
        session_id: sessionId,
        user_id: session.user_id!,
        store_id: store.id,
        product_id: product.id,
        metadata: {},
      });

      return product;
    });
  }

  // ============================================================
  // GET BY ID
  // ============================================================

  async getById(productId: string): Promise<Product> {
    const product =
      await this.productRepository.findById(productId);

    if (!product) {
      throw createAppError(Errors.PRODUCT_NOT_FOUND);
    }

    return product;
  }

  // ============================================================
  // GET BY STORE
  // ============================================================

  async getByStore(storeId: string): Promise<Product[]> {
    return this.productRepository.findByStoreId(storeId);
  }

  // ============================================================
  // GET BY CATEGORY
  // ============================================================

  async getByCategory(
    categoryId: string,
  ): Promise<Product[]> {
    return this.productRepository.findByCategoryId(
      categoryId,
    );
  }

  // ============================================================
  // GET AVAILABLE BY STORE
  // ============================================================

  async getAvailableByStore(
    storeId: string,
  ): Promise<Product[]> {
    return this.productRepository.findAvailableByStoreId(
      storeId,
    );
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    sessionId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const session =
      await this.getAuthenticatedSession(sessionId);

    const { product, store } =
      await this.getOwnedProduct(
        productId,
        session.user_id!,
      );

    this.assertActiveStore(store);

    const updateData: {
      category_id?: string;
      name?: string;
      description?: string | null;
      price?: number;
    } = {};

    if (input.category_id !== undefined) {
      const category = await this.validateCategory(
        input.category_id,
      );

      updateData.category_id = category.id;
    }

    if (input.name !== undefined) {
      updateData.name = this.validateName(input.name);
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.price !== undefined) {
      updateData.price = this.validatePrice(input.price);
    }

    return this.database.transaction(async (trx) => {
      const trxProductRepository =
        new ProductRepository(trx);

      const trxEventRepository =
        new EventRepository(trx);

      const updatedProduct =
        await trxProductRepository.update(
          product.id,
          updateData,
        );

      if (!updatedProduct) {
        throw createAppError(Errors.PRODUCT_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "product.updated",
        session_id: sessionId,
        user_id: session.user_id!,
        store_id: store.id,
        product_id: product.id,
        metadata: {},
      });

      return updatedProduct;
    });
  }

  // ============================================================
  // SET AVAILABILITY
  // ============================================================

  async setAvailability(
    sessionId: string,
    productId: string,
    availability: ProductAvailability,
  ): Promise<Product> {
    const session =
      await this.getAuthenticatedSession(sessionId);

    const { product, store } =
      await this.getOwnedProduct(
        productId,
        session.user_id!,
      );

    this.assertActiveStore(store);

    if (product.status !== "active") {
      throw createAppError(
        Errors.INVALID_PRODUCT_STATUS_TRANSITION,
      );
    }

    if (
      availability !== "available" &&
      availability !== "unavailable"
    ) {
      throw createAppError(Errors.INVALID_PRODUCT);
    }

    if (product.availability === availability) {
      throw createAppError(
        Errors.INVALID_PRODUCT_STATUS_TRANSITION,
      );
    }

    return this.database.transaction(async (trx) => {
      const trxProductRepository =
        new ProductRepository(trx);

      const trxEventRepository =
        new EventRepository(trx);

      const updatedProduct =
        await trxProductRepository.setAvailability(
          productId,
          availability,
        );

      if (!updatedProduct) {
        throw createAppError(Errors.PRODUCT_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "product.availability_changed",
        session_id: sessionId,
        user_id: session.user_id!,
        store_id: store.id,
        product_id: product.id,
        metadata: {
          from: product.availability,
          to: availability,
        },
      });

      return updatedProduct;
    });
  }

  // ============================================================
  // ARCHIVE
  // ============================================================

  async archive(
    sessionId: string,
    productId: string,
  ): Promise<Product> {
    const session =
      await this.getAuthenticatedSession(sessionId);

    const { product, store } =
      await this.getOwnedProduct(
        productId,
        session.user_id!,
      );

    this.assertActiveStore(store);

    if (product.status !== "active") {
      throw createAppError(
        Errors.INVALID_PRODUCT_STATUS_TRANSITION,
      );
    }

    return this.database.transaction(async (trx) => {
      const trxProductRepository =
        new ProductRepository(trx);

      const trxEventRepository =
        new EventRepository(trx);

      const archivedProduct =
        await trxProductRepository.setStatus(
          productId,
          "archived",
        );

      if (!archivedProduct) {
        throw createAppError(Errors.PRODUCT_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "product.archived",
        session_id: sessionId,
        user_id: session.user_id!,
        store_id: store.id,
        product_id: product.id,
        metadata: {},
      });

      return archivedProduct;
    });
  }

  // ============================================================
  // UNARCHIVE
  // ============================================================

  async unarchive(
    sessionId: string,
    productId: string,
  ): Promise<Product> {
    const session =
      await this.getAuthenticatedSession(sessionId);

    const { product, store } =
      await this.getOwnedProduct(
        productId,
        session.user_id!,
      );

    this.assertActiveStore(store);

    if (product.status !== "archived") {
      throw createAppError(
        Errors.INVALID_PRODUCT_STATUS_TRANSITION,
      );
    }

    return this.database.transaction(async (trx) => {
      const trxProductRepository =
        new ProductRepository(trx);

      const trxEventRepository =
        new EventRepository(trx);

      const unarchivedProduct =
        await trxProductRepository.setStatus(
          productId,
          "active",
        );

      if (!unarchivedProduct) {
        throw createAppError(Errors.PRODUCT_NOT_FOUND);
      }

      await trxEventRepository.create({
        event_name: "product.unarchived",
        session_id: sessionId,
        user_id: session.user_id!,
        store_id: store.id,
        product_id: product.id,
        metadata: {},
      });

      return unarchivedProduct;
    });
  }
}
