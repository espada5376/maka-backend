import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProductImageService,
  ProductImageServiceError,
  ProductImageErrorCode,
} from "../../src/services/product-image.service.js";

describe("ProductImageService", () => {
  const productImageRepository = {
    findById: vi.fn(),
    findByProductId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByProductId: vi.fn(),
  };

  const productImageService = new ProductImageService(
    productImageRepository as any,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should return the image when it exists", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.findById.mockResolvedValue(image);

      await expect(productImageService.getById("image-1")).resolves.toEqual(
        image,
      );

      expect(productImageRepository.findById).toHaveBeenCalledWith("image-1");
    });

    it("should throw when the image does not exist", async () => {
      productImageRepository.findById.mockResolvedValue(undefined);

      await expect(
        productImageService.getById("unknown"),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.IMAGE_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findById.mockRejectedValue(error);

      await expect(productImageService.getById("image-1")).rejects.toThrow(
        error,
      );
    });
  });

  describe("getByProductId", () => {
    it("should return all images of a product", async () => {
      const images = [
        {
          id: "image-1",
          product_id: "product-1",
          url: "https://example.com/1.jpg",
          position: 0,
          created_at: new Date(),
        },
        {
          id: "image-2",
          product_id: "product-1",
          url: "https://example.com/2.jpg",
          position: 1,
          created_at: new Date(),
        },
      ];

      productImageRepository.findByProductId.mockResolvedValue(images);

      await expect(
        productImageService.getByProductId("product-1"),
      ).resolves.toEqual(images);

      expect(productImageRepository.findByProductId).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should return an empty array when the product has no images", async () => {
      productImageRepository.findByProductId.mockResolvedValue([]);

      await expect(
        productImageService.getByProductId("product-1"),
      ).resolves.toEqual([]);

      expect(productImageRepository.findByProductId).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findByProductId.mockRejectedValue(error);

      await expect(
        productImageService.getByProductId("product-1"),
      ).rejects.toThrow(error);
    });
  });

  describe("create", () => {
    it("should create an image with valid data", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.create.mockResolvedValue(image);

      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "https://example.com/image.jpg",
          position: 0,
        }),
      ).resolves.toEqual(image);

      expect(productImageRepository.create).toHaveBeenCalledWith({
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
      });
    });

    it("should trim product_id", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.create.mockResolvedValue(image);

      await productImageService.create({
        product_id: "  product-1  ",
        url: "https://example.com/image.jpg",
        position: 0,
      });

      expect(productImageRepository.create).toHaveBeenCalledWith({
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
      });
    });

    it("should trim the url", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.create.mockResolvedValue(image);

      await productImageService.create({
        product_id: "product-1",
        url: "  https://example.com/image.jpg  ",
        position: 0,
      });

      expect(productImageRepository.create).toHaveBeenCalledWith({
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
      });
    });

    it("should reject an empty product_id", async () => {
      await expect(
        productImageService.create({
          product_id: "",
          url: "https://example.com/image.jpg",
          position: 0,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_PRODUCT_ID,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only product_id", async () => {
      await expect(
        productImageService.create({
          product_id: "   ",
          url: "https://example.com/image.jpg",
          position: 0,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_PRODUCT_ID,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject an empty url", async () => {
      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "",
          position: 0,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_URL,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only url", async () => {
      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "   ",
          position: 0,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_URL,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a negative position", async () => {
      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "https://example.com/image.jpg",
          position: -1,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_POSITION,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a non-integer position", async () => {
      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "https://example.com/image.jpg",
          position: 1.5,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_POSITION,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should reject NaN as position", async () => {
      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "https://example.com/image.jpg",
          position: Number.NaN,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_POSITION,
      });

      expect(productImageRepository.create).not.toHaveBeenCalled();
    });

    it("should allow position 0", async () => {
      const image = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.create.mockResolvedValue(image);

      await productImageService.create({
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
      });

      expect(productImageRepository.create).toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.create.mockRejectedValue(error);

      await expect(
        productImageService.create({
          product_id: "product-1",
          url: "https://example.com/image.jpg",
          position: 0,
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("update", () => {
    it("should update the url", async () => {
      const existingImage = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/old.jpg",
        position: 0,
        created_at: new Date(),
      };

      const updatedImage = {
        ...existingImage,
        url: "https://example.com/new.jpg",
      };

      productImageRepository.findById.mockResolvedValue(existingImage);
      productImageRepository.update.mockResolvedValue(updatedImage);

      await expect(
        productImageService.update("image-1", {
          url: "https://example.com/new.jpg",
        }),
      ).resolves.toEqual(updatedImage);

      expect(productImageRepository.update).toHaveBeenCalledWith("image-1", {
        url: "https://example.com/new.jpg",
      });
    });

    it("should trim the updated url", async () => {
      const existingImage = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/old.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.findById.mockResolvedValue(existingImage);
      productImageRepository.update.mockResolvedValue({
        ...existingImage,
        url: "https://example.com/new.jpg",
      });

      await productImageService.update("image-1", {
        url: "  https://example.com/new.jpg  ",
      });

      expect(productImageRepository.update).toHaveBeenCalledWith("image-1", {
        url: "https://example.com/new.jpg",
      });
    });

    it("should update the position", async () => {
      const existingImage = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      const updatedImage = {
        ...existingImage,
        position: 2,
      };

      productImageRepository.findById.mockResolvedValue(existingImage);
      productImageRepository.update.mockResolvedValue(updatedImage);

      await expect(
        productImageService.update("image-1", {
          position: 2,
        }),
      ).resolves.toEqual(updatedImage);

      expect(productImageRepository.update).toHaveBeenCalledWith("image-1", {
        position: 2,
      });
    });

    it("should update both url and position", async () => {
      const existingImage = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/old.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.findById.mockResolvedValue(existingImage);
      productImageRepository.update.mockResolvedValue({
        ...existingImage,
        url: "https://example.com/new.jpg",
        position: 2,
      });

      await productImageService.update("image-1", {
        url: "  https://example.com/new.jpg  ",
        position: 2,
      });

      expect(productImageRepository.update).toHaveBeenCalledWith("image-1", {
        url: "https://example.com/new.jpg",
        position: 2,
      });
    });

    it("should allow updating the url to null only if repository type permits it", async () => {
      const existingImage = {
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      };

      productImageRepository.findById.mockResolvedValue(existingImage);

      await expect(
        productImageService.update("image-1", {
          url: null as any,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_URL,
      });

      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should reject an empty updated url", async () => {
      await expect(
        productImageService.update("image-1", {
          url: "",
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_URL,
      });

      expect(productImageRepository.findById).not.toHaveBeenCalled();
      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only updated url", async () => {
      await expect(
        productImageService.update("image-1", {
          url: "   ",
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_URL,
      });

      expect(productImageRepository.findById).not.toHaveBeenCalled();
      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should reject a negative updated position", async () => {
      await expect(
        productImageService.update("image-1", {
          position: -1,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_POSITION,
      });

      expect(productImageRepository.findById).not.toHaveBeenCalled();
      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should reject a non-integer updated position", async () => {
      await expect(
        productImageService.update("image-1", {
          position: 1.5,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_POSITION,
      });

      expect(productImageRepository.findById).not.toHaveBeenCalled();
      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when the image does not exist", async () => {
      productImageRepository.findById.mockResolvedValue(undefined);

      await expect(
        productImageService.update("unknown", {
          position: 1,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.IMAGE_NOT_FOUND,
      });

      expect(productImageRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when repository update returns undefined", async () => {
      productImageRepository.findById.mockResolvedValue({
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      });

      productImageRepository.update.mockResolvedValue(undefined);

      await expect(
        productImageService.update("image-1", {
          position: 1,
        }),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.IMAGE_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findById.mockResolvedValue({
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      });

      productImageRepository.update.mockRejectedValue(error);

      await expect(
        productImageService.update("image-1", {
          position: 1,
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("delete", () => {
    it("should delete an existing image", async () => {
      productImageRepository.findById.mockResolvedValue({
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      });

      productImageRepository.delete.mockResolvedValue(1);

      await expect(
        productImageService.delete("image-1"),
      ).resolves.toBeUndefined();

      expect(productImageRepository.delete).toHaveBeenCalledWith("image-1");
    });

    it("should throw when the image does not exist", async () => {
      productImageRepository.findById.mockResolvedValue(undefined);

      await expect(productImageService.delete("unknown")).rejects.toMatchObject(
        {
          code: ProductImageErrorCode.IMAGE_NOT_FOUND,
        },
      );

      expect(productImageRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw when repository deletes nothing", async () => {
      productImageRepository.findById.mockResolvedValue({
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      });

      productImageRepository.delete.mockResolvedValue(0);

      await expect(productImageService.delete("image-1")).rejects.toMatchObject(
        {
          code: ProductImageErrorCode.IMAGE_NOT_FOUND,
        },
      );
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findById.mockResolvedValue({
        id: "image-1",
        product_id: "product-1",
        url: "https://example.com/image.jpg",
        position: 0,
        created_at: new Date(),
      });

      productImageRepository.delete.mockRejectedValue(error);

      await expect(productImageService.delete("image-1")).rejects.toThrow(
        error,
      );
    });
  });

  describe("deleteByProductId", () => {
    it("should delete all images of a product", async () => {
      productImageRepository.deleteByProductId.mockResolvedValue(3);

      await expect(
        productImageService.deleteByProductId("product-1"),
      ).resolves.toBe(3);

      expect(productImageRepository.deleteByProductId).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should return zero when the product has no images", async () => {
      productImageRepository.deleteByProductId.mockResolvedValue(0);

      await expect(
        productImageService.deleteByProductId("product-1"),
      ).resolves.toBe(0);

      expect(productImageRepository.deleteByProductId).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should reject an empty product_id", async () => {
      await expect(
        productImageService.deleteByProductId(""),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_PRODUCT_ID,
      });

      expect(productImageRepository.deleteByProductId).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only product_id", async () => {
      await expect(
        productImageService.deleteByProductId("   "),
      ).rejects.toMatchObject({
        code: ProductImageErrorCode.INVALID_PRODUCT_ID,
      });

      expect(productImageRepository.deleteByProductId).not.toHaveBeenCalled();
    });

    it("should trim product_id", async () => {
      productImageRepository.deleteByProductId.mockResolvedValue(2);

      await productImageService.deleteByProductId("  product-1  ");

      expect(productImageRepository.deleteByProductId).toHaveBeenCalledWith(
        "product-1",
      );
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.deleteByProductId.mockRejectedValue(error);

      await expect(
        productImageService.deleteByProductId("product-1"),
      ).rejects.toThrow(error);
    });
  });

  describe("ProductImageServiceError", () => {
    it("should expose a ProductImageServiceError-compatible error type", () => {
      const error = new ProductImageServiceError(
        ProductImageErrorCode.IMAGE_NOT_FOUND,
        "Image not found",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProductImageServiceError);
      expect(error.code).toBe(ProductImageErrorCode.IMAGE_NOT_FOUND);
      expect(error.name).toBe("ProductImageServiceError");
    });
  });
});
