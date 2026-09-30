import { ProductImageRepository, } from "../database/repositories/product-image.repository.js";
export var ProductImageErrorCode;
(function (ProductImageErrorCode) {
    ProductImageErrorCode["IMAGE_NOT_FOUND"] = "IMAGE_NOT_FOUND";
    ProductImageErrorCode["INVALID_PRODUCT_ID"] = "INVALID_PRODUCT_ID";
    ProductImageErrorCode["INVALID_URL"] = "INVALID_URL";
    ProductImageErrorCode["INVALID_POSITION"] = "INVALID_POSITION";
})(ProductImageErrorCode || (ProductImageErrorCode = {}));
export class ProductImageServiceError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "ProductImageServiceError";
    }
}
export class ProductImageService {
    productImageRepository;
    constructor(productImageRepository = new ProductImageRepository()) {
        this.productImageRepository = productImageRepository;
    }
    async getById(id) {
        const image = await this.productImageRepository.findById(id);
        if (!image) {
            throw new ProductImageServiceError(ProductImageErrorCode.IMAGE_NOT_FOUND, `Product image not found: ${id}`);
        }
        return image;
    }
    async getByProductId(productId) {
        const normalizedProductId = this.normalizeProductId(productId);
        return this.productImageRepository.findByProductId(normalizedProductId);
    }
    async create(data) {
        const productId = this.normalizeProductId(data.product_id);
        const url = this.normalizeUrl(data.url);
        const position = this.validatePosition(data.position);
        return this.productImageRepository.create({
            product_id: productId,
            url,
            position,
        });
    }
    async update(id, data) {
        const updateData = {};
        if (data.url !== undefined) {
            updateData.url = this.normalizeUrl(data.url);
        }
        if (data.position !== undefined) {
            updateData.position = this.validatePosition(data.position);
        }
        await this.getById(id);
        const image = await this.productImageRepository.update(id, updateData);
        if (!image) {
            throw new ProductImageServiceError(ProductImageErrorCode.IMAGE_NOT_FOUND, `Product image not found: ${id}`);
        }
        return image;
    }
    async delete(id) {
        await this.getById(id);
        const deletedCount = await this.productImageRepository.delete(id);
        if (deletedCount === 0) {
            throw new ProductImageServiceError(ProductImageErrorCode.IMAGE_NOT_FOUND, `Product image not found: ${id}`);
        }
    }
    async deleteByProductId(productId) {
        const normalizedProductId = this.normalizeProductId(productId);
        return this.productImageRepository.deleteByProductId(normalizedProductId);
    }
    normalizeProductId(productId) {
        if (typeof productId !== "string") {
            throw new ProductImageServiceError(ProductImageErrorCode.INVALID_PRODUCT_ID, "Product ID must be a string");
        }
        const normalizedProductId = productId.trim();
        if (!normalizedProductId) {
            throw new ProductImageServiceError(ProductImageErrorCode.INVALID_PRODUCT_ID, "Product ID cannot be empty");
        }
        return normalizedProductId;
    }
    normalizeUrl(url) {
        if (typeof url !== "string") {
            throw new ProductImageServiceError(ProductImageErrorCode.INVALID_URL, "URL must be a string");
        }
        const normalizedUrl = url.trim();
        if (!normalizedUrl) {
            throw new ProductImageServiceError(ProductImageErrorCode.INVALID_URL, "URL cannot be empty");
        }
        return normalizedUrl;
    }
    validatePosition(position) {
        if (!Number.isInteger(position) ||
            !Number.isFinite(position) ||
            position < 0) {
            throw new ProductImageServiceError(ProductImageErrorCode.INVALID_POSITION, "Position must be a non-negative integer");
        }
        return position;
    }
}
