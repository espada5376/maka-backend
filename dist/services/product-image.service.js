import { randomUUID } from "node:crypto";
import { AppError } from "../common/errors/app-error.js";
import { Errors } from "../common/errors/errors.js";
const MAX_IMAGES_PER_PRODUCT = 4;
export class ProductImageService {
    productImageRepository;
    sessionRepository;
    productRepository;
    storeRepository;
    imageProcessor;
    imageStorage;
    constructor(productImageRepository, sessionRepository, productRepository, storeRepository, imageProcessor, imageStorage) {
        this.productImageRepository = productImageRepository;
        this.sessionRepository = sessionRepository;
        this.productRepository = productRepository;
        this.storeRepository = storeRepository;
        this.imageProcessor = imageProcessor;
        this.imageStorage = imageStorage;
    }
    async getById(id) {
        const image = await this.productImageRepository.findById(id);
        if (!image) {
            throw new AppError(Errors.PRODUCT_IMAGE_NOT_FOUND.code, Errors.PRODUCT_IMAGE_NOT_FOUND.message, Errors.PRODUCT_IMAGE_NOT_FOUND.statusCode);
        }
        return this.toResponse(image);
    }
    async getByProductId(productId) {
        const normalizedProductId = this.normalizeProductId(productId);
        const images = await this.productImageRepository.findByProductId(normalizedProductId);
        return images.map((image) => this.toResponse(image));
    }
    async create(data) {
        const productId = this.normalizeProductId(data.product_id);
        await this.assertProductOwnership(productId, data.sessionId);
        if (!Buffer.isBuffer(data.data) ||
            data.data.length === 0) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID.code, "Image data must be a non-empty Buffer", Errors.PRODUCT_IMAGE_INVALID.statusCode);
        }
        if (typeof data.contentType !== "string" ||
            !data.contentType.trim()) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID.code, "Image content type is required", Errors.PRODUCT_IMAGE_INVALID.statusCode);
        }
        const existingImages = await this.productImageRepository.findByProductId(productId);
        if (existingImages.length >=
            MAX_IMAGES_PER_PRODUCT) {
            throw new AppError(Errors.PRODUCT_IMAGE_MAX_REACHED.code, Errors.PRODUCT_IMAGE_MAX_REACHED.message, Errors.PRODUCT_IMAGE_MAX_REACHED.statusCode);
        }
        const position = existingImages.length;
        const processedImage = await this.imageProcessor.process(data.data, data.contentType);
        const imageId = randomUUID();
        const storageKey = `products/${productId}/${imageId}.webp`;
        await this.imageStorage.upload(storageKey, processedImage.data, processedImage.contentType);
        try {
            const imageData = {
                id: imageId,
                product_id: productId,
                storage_key: storageKey,
                position,
            };
            const image = await this.productImageRepository.create(imageData);
            return this.toResponse(image);
        }
        catch (error) {
            await this.cleanupUploadedImage(storageKey);
            throw error;
        }
    }
    async update(id, data) {
        const image = await this.productImageRepository.findById(id);
        if (!image) {
            throw new AppError(Errors.PRODUCT_IMAGE_NOT_FOUND.code, Errors.PRODUCT_IMAGE_NOT_FOUND.message, Errors.PRODUCT_IMAGE_NOT_FOUND.statusCode);
        }
        await this.assertProductOwnership(image.product_id, data.sessionId);
        const updateData = {};
        if (data.position !== undefined) {
            updateData.position =
                this.validatePosition(data.position);
        }
        const updatedImage = await this.productImageRepository.update(id, updateData);
        if (!updatedImage) {
            throw new AppError(Errors.PRODUCT_IMAGE_NOT_FOUND.code, Errors.PRODUCT_IMAGE_NOT_FOUND.message, Errors.PRODUCT_IMAGE_NOT_FOUND.statusCode);
        }
        return this.toResponse(updatedImage);
    }
    async delete(id, sessionId) {
        const image = await this.productImageRepository.findById(id);
        if (!image) {
            throw new AppError(Errors.PRODUCT_IMAGE_NOT_FOUND.code, Errors.PRODUCT_IMAGE_NOT_FOUND.message, Errors.PRODUCT_IMAGE_NOT_FOUND.statusCode);
        }
        await this.assertProductOwnership(image.product_id, sessionId);
        await this.imageStorage.delete(image.storage_key);
        const deletedCount = await this.productImageRepository.delete(id);
        if (deletedCount === 0) {
            throw new AppError(Errors.PRODUCT_IMAGE_NOT_FOUND.code, Errors.PRODUCT_IMAGE_NOT_FOUND.message, Errors.PRODUCT_IMAGE_NOT_FOUND.statusCode);
        }
    }
    async reorder(productId, sessionId, imageIds) {
        const normalizedProductId = this.normalizeProductId(productId);
        await this.assertProductOwnership(normalizedProductId, sessionId);
        if (!Array.isArray(imageIds) ||
            imageIds.length === 0) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID_ORDER.code, Errors.PRODUCT_IMAGE_INVALID_ORDER.message, Errors.PRODUCT_IMAGE_INVALID_ORDER.statusCode);
        }
        const hasDuplicates = new Set(imageIds).size !== imageIds.length;
        if (hasDuplicates) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID_ORDER.code, "Image order cannot contain duplicates", Errors.PRODUCT_IMAGE_INVALID_ORDER.statusCode);
        }
        const images = await this.productImageRepository.findByProductId(normalizedProductId);
        if (images.length !== imageIds.length) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID_ORDER.code, "Image order must contain all product images", Errors.PRODUCT_IMAGE_INVALID_ORDER.statusCode);
        }
        const existingIds = new Set(images.map((image) => image.id));
        for (const imageId of imageIds) {
            if (!existingIds.has(imageId)) {
                throw new AppError(Errors.PRODUCT_IMAGE_INVALID_ORDER.code, `Image does not belong to product: ${imageId}`, Errors.PRODUCT_IMAGE_INVALID_ORDER.statusCode);
            }
        }
        const updates = imageIds.map((imageId, position) => ({
            id: imageId,
            position,
        }));
        const reorderedImages = await this.productImageRepository.reorderPositions(normalizedProductId, updates);
        return reorderedImages.map((image) => this.toResponse(image));
    }
    async deleteByProductId(productId, sessionId) {
        const normalizedProductId = this.normalizeProductId(productId);
        await this.assertProductOwnership(normalizedProductId, sessionId);
        const images = await this.productImageRepository.findByProductId(normalizedProductId);
        if (images.length === 0) {
            return 0;
        }
        for (const image of images) {
            await this.imageStorage.delete(image.storage_key);
        }
        return this.productImageRepository.deleteByProductId(normalizedProductId);
    }
    async assertProductOwnership(productId, sessionId) {
        const session = await this.sessionRepository.findById(sessionId);
        if (!session) {
            throw new AppError(Errors.SESSION_NOT_FOUND.code, Errors.SESSION_NOT_FOUND.message, Errors.SESSION_NOT_FOUND.statusCode);
        }
        if (session.expires_at <= new Date()) {
            throw new AppError(Errors.SESSION_EXPIRED.code, Errors.SESSION_EXPIRED.message, Errors.SESSION_EXPIRED.statusCode);
        }
        if (!session.user_id) {
            throw new AppError(Errors.PRODUCT_FORBIDDEN.code, Errors.PRODUCT_FORBIDDEN.message, Errors.PRODUCT_FORBIDDEN.statusCode);
        }
        const product = await this.productRepository.findById(productId);
        if (!product) {
            throw new AppError(Errors.PRODUCT_NOT_FOUND.code, Errors.PRODUCT_NOT_FOUND.message, Errors.PRODUCT_NOT_FOUND.statusCode);
        }
        const store = await this.storeRepository.findById(product.store_id);
        if (!store) {
            throw new AppError(Errors.STORE_NOT_FOUND.code, Errors.STORE_NOT_FOUND.message, Errors.STORE_NOT_FOUND.statusCode);
        }
        if (store.owner_id !== session.user_id) {
            throw new AppError(Errors.PRODUCT_FORBIDDEN.code, Errors.PRODUCT_FORBIDDEN.message, Errors.PRODUCT_FORBIDDEN.statusCode);
        }
    }
    toResponse(image) {
        return {
            id: image.id,
            product_id: image.product_id,
            url: this.imageStorage.getUrl(image.storage_key),
            position: image.position,
            created_at: image.created_at,
        };
    }
    async cleanupUploadedImage(storageKey) {
        try {
            await this.imageStorage.delete(storageKey);
        }
        catch {
            // Preserve original DB error.
        }
    }
    normalizeProductId(productId) {
        if (typeof productId !== "string" ||
            !productId.trim()) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID.code, "Product ID is required", Errors.PRODUCT_IMAGE_INVALID.statusCode);
        }
        return productId.trim();
    }
    validatePosition(position) {
        if (!Number.isInteger(position) ||
            position < 0) {
            throw new AppError(Errors.PRODUCT_IMAGE_INVALID_POSITION.code, Errors.PRODUCT_IMAGE_INVALID_POSITION.message, Errors.PRODUCT_IMAGE_INVALID_POSITION.statusCode);
        }
        return position;
    }
}
