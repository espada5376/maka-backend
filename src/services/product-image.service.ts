import { randomUUID } from "node:crypto";

import {
  ProductImageRepository,
  type ProductImage,
  type CreateProductImageData,
  type UpdateProductImageData,
} from "../database/repositories/product-image.repository.js";

import { SessionRepository } from "../database/repositories/session.repository.js";
import { ProductRepository } from "../database/repositories/product.repository.js";
import { StoreRepository } from "../database/repositories/store.repository.js";

import type { ImageProcessor } from "../image-processing/ImageProcessor.js";
import type { ImageStorage } from "../storage/ImageStorage.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";

export interface CreateProductImageInput {
  sessionId: string;
  product_id: string;
  data: Buffer;
  contentType: string;
}

export interface UpdateProductImageInput {
  sessionId: string;
  position?: number;
}

export interface ProductImageResponse {
  id: string;
  product_id: string;
  url: string;
  position: number;
  created_at: Date;
}

const MAX_IMAGES_PER_PRODUCT = 4;

export class ProductImageService {
  constructor(
    private readonly productImageRepository: ProductImageRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly productRepository: ProductRepository,
    private readonly storeRepository: StoreRepository,
    private readonly imageProcessor: ImageProcessor,
    private readonly imageStorage: ImageStorage,
  ) {}

  async getById(id: string): Promise<ProductImageResponse> {
    const image = await this.productImageRepository.findById(id);

    if (!image) {
      throw createAppError(Errors.PRODUCT_IMAGE_NOT_FOUND);
    }

    return this.toResponse(image);
  }

  async getByProductId(productId: string): Promise<ProductImageResponse[]> {
    const normalizedProductId = this.normalizeProductId(productId);

    const images =
      await this.productImageRepository.findByProductId(normalizedProductId);

    return images.map((image) => this.toResponse(image));
  }

  async create(data: CreateProductImageInput): Promise<ProductImageResponse> {
    const productId = this.normalizeProductId(data.product_id);

    await this.assertProductOwnership(productId, data.sessionId);

    if (!Buffer.isBuffer(data.data) || data.data.length === 0) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID);
    }

    if (typeof data.contentType !== "string" || !data.contentType.trim()) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID);
    }

    if (typeof data.contentType !== "string" || !data.contentType.trim()) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID);
    }

    const existingImages =
      await this.productImageRepository.findByProductId(productId);

    if (existingImages.length >= MAX_IMAGES_PER_PRODUCT) {
      throw createAppError(Errors.PRODUCT_IMAGE_MAX_REACHED);
    }

    const position = existingImages.length;

    const processedImage = await this.imageProcessor.process(
      data.data,
      data.contentType,
    );

    const imageId = randomUUID();

    const storageKey = `products/${productId}/${imageId}.webp`;

    await this.imageStorage.upload(
      storageKey,
      processedImage.data,
      processedImage.contentType,
    );

    try {
      const imageData: CreateProductImageData = {
        id: imageId,
        product_id: productId,
        storage_key: storageKey,
        position,
      };

      const image = await this.productImageRepository.create(imageData);

      return this.toResponse(image);
    } catch (error) {
      await this.cleanupUploadedImage(storageKey);

      throw error;
    }
  }

  async update(
    id: string,
    data: UpdateProductImageInput,
  ): Promise<ProductImageResponse> {
    const image = await this.productImageRepository.findById(id);

    if (!image) {
      throw createAppError(Errors.PRODUCT_IMAGE_NOT_FOUND);
    }

    await this.assertProductOwnership(image.product_id, data.sessionId);

    const updateData: UpdateProductImageData = {};

    if (data.position !== undefined) {
      updateData.position = this.validatePosition(data.position);
    }

    const updatedImage = await this.productImageRepository.update(
      id,
      updateData,
    );

    if (!updatedImage) {
      throw createAppError(Errors.PRODUCT_IMAGE_NOT_FOUND);
    }

    return this.toResponse(updatedImage);
  }

  async delete(id: string, sessionId: string): Promise<void> {
    const image = await this.productImageRepository.findById(id);

    if (!image) {
      throw createAppError(Errors.PRODUCT_IMAGE_NOT_FOUND);
    }

    await this.assertProductOwnership(image.product_id, sessionId);

    await this.imageStorage.delete(image.storage_key);

    const deletedCount = await this.productImageRepository.delete(id);

    if (deletedCount === 0) {
      throw createAppError(Errors.PRODUCT_IMAGE_NOT_FOUND);
    }
  }

  async reorder(
    productId: string,
    sessionId: string,
    imageIds: string[],
  ): Promise<ProductImageResponse[]> {
    const normalizedProductId = this.normalizeProductId(productId);

    await this.assertProductOwnership(normalizedProductId, sessionId);

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID_ORDER);
    }

    const hasDuplicates = new Set(imageIds).size !== imageIds.length;

    if (hasDuplicates) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID_ORDER);
    }

    const images =
      await this.productImageRepository.findByProductId(normalizedProductId);

    if (images.length !== imageIds.length) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID_ORDER);
    }

    const existingIds = new Set(images.map((image) => image.id));

    for (const imageId of imageIds) {
      if (!existingIds.has(imageId)) {
        throw createAppError(Errors.PRODUCT_IMAGE_INVALID_ORDER);
      }
    }

    const updates = imageIds.map((imageId, position) => ({
      id: imageId,
      position,
    }));

    const reorderedImages = await this.productImageRepository.reorderPositions(
      normalizedProductId,
      updates,
    );

    return reorderedImages.map((image) => this.toResponse(image));
  }

  async deleteByProductId(
    productId: string,
    sessionId: string,
  ): Promise<number> {
    const normalizedProductId = this.normalizeProductId(productId);

    await this.assertProductOwnership(normalizedProductId, sessionId);

    const images =
      await this.productImageRepository.findByProductId(normalizedProductId);

    if (images.length === 0) {
      return 0;
    }

    for (const image of images) {
      await this.imageStorage.delete(image.storage_key);
    }

    return this.productImageRepository.deleteByProductId(normalizedProductId);
  }

  private async assertProductOwnership(
    productId: string,
    sessionId: string,
  ): Promise<void> {
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

    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw createAppError(Errors.PRODUCT_NOT_FOUND);
    }

    const store = await this.storeRepository.findById(product.store_id);

    if (!store) {
      throw createAppError(Errors.STORE_NOT_FOUND);
    }

    if (store.owner_id !== session.user_id) {
      throw createAppError(Errors.PRODUCT_FORBIDDEN);
    }
  }

  private toResponse(image: ProductImage): ProductImageResponse {
    return {
      id: image.id,
      product_id: image.product_id,
      url: this.imageStorage.getUrl(image.storage_key),
      position: image.position,
      created_at: image.created_at,
    };
  }

  private async cleanupUploadedImage(storageKey: string): Promise<void> {
    try {
      await this.imageStorage.delete(storageKey);
    } catch {
      // Preserve original DB error.
    }
  }

  private normalizeProductId(productId: string): string {
    if (typeof productId !== "string" || !productId.trim()) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID);
    }

    return productId.trim();
  }

  private validatePosition(position: number): number {
    if (!Number.isInteger(position) || position < 0) {
      throw createAppError(Errors.PRODUCT_IMAGE_INVALID_POSITION);
    }

    return position;
  }
}
