import {
  ProductImageRepository,
  type ProductImage,
  type CreateProductImageData,
  type UpdateProductImageData,
} from "../database/repositories/product-image.repository.js";

export enum ProductImageErrorCode {
  IMAGE_NOT_FOUND = "IMAGE_NOT_FOUND",
  INVALID_PRODUCT_ID = "INVALID_PRODUCT_ID",
  INVALID_URL = "INVALID_URL",
  INVALID_POSITION = "INVALID_POSITION",
}

export class ProductImageServiceError extends Error {
  constructor(
    public readonly code: ProductImageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProductImageServiceError";
  }
}

export class ProductImageService {
  constructor(
    private readonly productImageRepository: ProductImageRepository = new ProductImageRepository(),
  ) {}

  async getById(id: string): Promise<ProductImage> {
    const image = await this.productImageRepository.findById(id);

    if (!image) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.IMAGE_NOT_FOUND,
        `Product image not found: ${id}`,
      );
    }

    return image;
  }

  async getByProductId(productId: string): Promise<ProductImage[]> {
    const normalizedProductId = this.normalizeProductId(productId);

    return this.productImageRepository.findByProductId(normalizedProductId);
  }

  async create(data: CreateProductImageData): Promise<ProductImage> {
    const productId = this.normalizeProductId(data.product_id);
    const url = this.normalizeUrl(data.url);
    const position = this.validatePosition(data.position);

    return this.productImageRepository.create({
      product_id: productId,
      url,
      position,
    });
  }

  async update(
    id: string,
    data: UpdateProductImageData,
  ): Promise<ProductImage> {
    const updateData: UpdateProductImageData = {};

    if (data.url !== undefined) {
  updateData.url = this.normalizeUrl(data.url);
}

if (data.position !== undefined) {
  updateData.position = this.validatePosition(data.position);
}

    await this.getById(id);

    const image = await this.productImageRepository.update(id, updateData);

    if (!image) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.IMAGE_NOT_FOUND,
        `Product image not found: ${id}`,
      );
    }

    return image;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    const deletedCount = await this.productImageRepository.delete(id);

    if (deletedCount === 0) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.IMAGE_NOT_FOUND,
        `Product image not found: ${id}`,
      );
    }
  }

  async deleteByProductId(productId: string): Promise<number> {
    const normalizedProductId = this.normalizeProductId(productId);

    return this.productImageRepository.deleteByProductId(normalizedProductId);
  }

  private normalizeProductId(productId: string): string {
    if (typeof productId !== "string") {
      throw new ProductImageServiceError(
        ProductImageErrorCode.INVALID_PRODUCT_ID,
        "Product ID must be a string",
      );
    }

    const normalizedProductId = productId.trim();

    if (!normalizedProductId) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.INVALID_PRODUCT_ID,
        "Product ID cannot be empty",
      );
    }

    return normalizedProductId;
  }

  private normalizeUrl(url: string): string {
    if (typeof url !== "string") {
      throw new ProductImageServiceError(
        ProductImageErrorCode.INVALID_URL,
        "URL must be a string",
      );
    }

    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.INVALID_URL,
        "URL cannot be empty",
      );
    }

    return normalizedUrl;
  }

  private validatePosition(position: number): number {
    if (
      !Number.isInteger(position) ||
      !Number.isFinite(position) ||
      position < 0
    ) {
      throw new ProductImageServiceError(
        ProductImageErrorCode.INVALID_POSITION,
        "Position must be a non-negative integer",
      );
    }

    return position;
  }
}
