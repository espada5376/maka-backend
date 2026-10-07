import { beforeEach, describe, expect, it, vi } from "vitest";

import { Errors } from "../../src/common/errors/errors.js";
import { ProductImageService } from "../../src/services/product-image.service.js";

describe("ProductImageService", () => {
  const productImageRepository = {
    findById: vi.fn(),
    findByProductId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    reorderPositions: vi.fn(),
    delete: vi.fn(),
    deleteByProductId: vi.fn(),
  };

  const sessionRepository = {
    findById: vi.fn(),
  };

  const productRepository = {
    findById: vi.fn(),
  };

  const storeRepository = {
    findById: vi.fn(),
  };

  const imageProcessor = {
    process: vi.fn(),
  };

  const imageStorage = {
    upload: vi.fn(),
    delete: vi.fn(),
    getUrl: vi.fn(),
  };

  const productImageService = new ProductImageService(
    productImageRepository as any,
    sessionRepository as any,
    productRepository as any,
    storeRepository as any,
    imageProcessor as any,
    imageStorage as any,
  );

  const originalData = Buffer.from("original-image");
  const processedData = Buffer.from("processed-webp");

  const existingImage = {
    id: "image-1",
    product_id: "product-1",
    storage_key: "products/product-1/image-1.webp",
    position: 0,
    created_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    sessionRepository.findById.mockResolvedValue({
      id: "session-1",
      user_id: "user-1",
    });

    productRepository.findById.mockResolvedValue({
      id: "product-1",
      store_id: "store-1",
    });

    storeRepository.findById.mockResolvedValue({
      id: "store-1",
      owner_id: "user-1",
    });

    imageProcessor.process.mockResolvedValue({
      data: processedData,
      contentType: "image/webp",
    });

    imageStorage.upload.mockResolvedValue(undefined);
    imageStorage.delete.mockResolvedValue(undefined);

    imageStorage.getUrl.mockImplementation(
      (storageKey: string) =>
        `https://images.maka.tg/${storageKey}`,
    );
  });

  describe("getById", () => {
    it("should return the image with its public URL", async () => {
      productImageRepository.findById.mockResolvedValue(
        existingImage,
      );

      await expect(
        productImageService.getById("image-1"),
      ).resolves.toEqual({
        id: "image-1",
        product_id: "product-1",
        url: "https://images.maka.tg/products/product-1/image-1.webp",
        position: 0,
        created_at: existingImage.created_at,
      });

      expect(
        productImageRepository.findById,
      ).toHaveBeenCalledWith("image-1");

      expect(imageStorage.getUrl).toHaveBeenCalledWith(
        existingImage.storage_key,
      );
    });

    it("should throw when the image does not exist", async () => {
      productImageRepository.findById.mockResolvedValue(
        undefined,
      );

      await expect(
        productImageService.getById("unknown"),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_NOT_FOUND.code,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findById.mockRejectedValue(error);

      await expect(
        productImageService.getById("image-1"),
      ).rejects.toThrow(error);
    });
  });

  describe("getByProductId", () => {
    it("should return all images with public URLs", async () => {
      const images = [
        existingImage,
        {
          ...existingImage,
          id: "image-2",
          storage_key:
            "products/product-1/image-2.webp",
          position: 1,
        },
      ];

      productImageRepository.findByProductId.mockResolvedValue(
        images,
      );

      await expect(
        productImageService.getByProductId("product-1"),
      ).resolves.toEqual([
        {
          id: "image-1",
          product_id: "product-1",
          url: "https://images.maka.tg/products/product-1/image-1.webp",
          position: 0,
          created_at: existingImage.created_at,
        },
        {
          id: "image-2",
          product_id: "product-1",
          url: "https://images.maka.tg/products/product-1/image-2.webp",
          position: 1,
          created_at: existingImage.created_at,
        },
      ]);
    });

    it("should trim product_id", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      await productImageService.getByProductId(
        "  product-1  ",
      );

      expect(
        productImageRepository.findByProductId,
      ).toHaveBeenCalledWith("product-1");
    });

    it("should return an empty array when there are no images", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      await expect(
        productImageService.getByProductId("product-1"),
      ).resolves.toEqual([]);
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findByProductId.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.getByProductId("product-1"),
      ).rejects.toThrow(error);
    });
  });

  describe("create", () => {
    it("should process, upload and create the image", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      productImageRepository.create.mockImplementation(
        async (data) => ({
          ...data,
          created_at: new Date(),
        }),
      );

      const result = await productImageService.create({
        sessionId: "session-1",
        product_id: "product-1",
        data: originalData,
        contentType: "image/jpeg",
      });

      expect(
        sessionRepository.findById,
      ).toHaveBeenCalledWith("session-1");

      expect(
        productRepository.findById,
      ).toHaveBeenCalledWith("product-1");

      expect(
        storeRepository.findById,
      ).toHaveBeenCalledWith("store-1");

      expect(imageProcessor.process).toHaveBeenCalledWith(
        originalData,
        "image/jpeg",
      );

      expect(imageStorage.upload).toHaveBeenCalledTimes(1);

      const uploadCall =
        imageStorage.upload.mock.calls[0];

      expect(uploadCall[0]).toMatch(
        /^products\/product-1\/.+\.webp$/,
      );

      expect(uploadCall[1]).toBe(processedData);
      expect(uploadCall[2]).toBe("image/webp");

      expect(
        productImageRepository.create,
      ).toHaveBeenCalledTimes(1);

      const repositoryData =
        productImageRepository.create.mock.calls[0][0];

      expect(repositoryData.product_id).toBe(
        "product-1",
      );

      expect(repositoryData.position).toBe(0);

      expect(repositoryData.storage_key).toBe(
        uploadCall[0],
      );

      expect(repositoryData.id).toMatch(
        /^[0-9a-f-]{36}$/,
      );

      expect(result.url).toBe(
        `https://images.maka.tg/${repositoryData.storage_key}`,
      );
    });

    it("should assign the next position", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [
          {
            ...existingImage,
            id: "image-1",
            position: 0,
          },
          {
            ...existingImage,
            id: "image-2",
            position: 1,
          },
        ],
      );

      productImageRepository.create.mockImplementation(
        async (data) => ({
          ...data,
          created_at: new Date(),
        }),
      );

      await productImageService.create({
        sessionId: "session-1",
        product_id: "product-1",
        data: originalData,
        contentType: "image/jpeg",
      });

      const repositoryData =
        productImageRepository.create.mock.calls[0][0];

      expect(repositoryData.position).toBe(2);
    });

    it("should trim product_id", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      productImageRepository.create.mockImplementation(
        async (data) => ({
          ...data,
          created_at: new Date(),
        }),
      );

      await productImageService.create({
        sessionId: "session-1",
        product_id: "  product-1  ",
        data: originalData,
        contentType: "image/jpeg",
      });

      expect(
        productImageRepository.findByProductId,
      ).toHaveBeenCalledWith("product-1");

      expect(
        productImageRepository.create.mock.calls[0][0]
          .product_id,
      ).toBe("product-1");
    });

    it("should reject an empty product_id", async () => {
      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();

      expect(
        imageProcessor.process,
      ).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only product_id", async () => {
      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "   ",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });
    });

    it("should reject empty image data", async () => {
      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: Buffer.alloc(0),
          contentType: "image/jpeg",
        }),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        imageProcessor.process,
      ).not.toHaveBeenCalled();
    });

    it("should reject an empty content type", async () => {
      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "   ",
        }),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        imageProcessor.process,
      ).not.toHaveBeenCalled();
    });

    it("should reject when the product already has 4 images", async () => {
      productImageRepository.findByProductId.mockResolvedValue([
        { ...existingImage, id: "image-1" },
        { ...existingImage, id: "image-2" },
        { ...existingImage, id: "image-3" },
        { ...existingImage, id: "image-4" },
      ]);

      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_MAX_REACHED.code,
      });

      expect(
        imageProcessor.process,
      ).not.toHaveBeenCalled();

      expect(
        imageStorage.upload,
      ).not.toHaveBeenCalled();

      expect(
        productImageRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should clean up the uploaded object when repository creation fails", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      const error = new Error("database error");

      productImageRepository.create.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(error);

      const storageKey =
        imageStorage.upload.mock.calls[0][0];

      expect(imageStorage.delete).toHaveBeenCalledWith(
        storageKey,
      );
    });

    it("should propagate processor errors", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      const error = new Error("processing error");

      imageProcessor.process.mockRejectedValue(error);

      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(error);

      expect(
        imageStorage.upload,
      ).not.toHaveBeenCalled();

      expect(
        productImageRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate storage upload errors", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      const error = new Error("storage error");

      imageStorage.upload.mockRejectedValue(error);

      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(error);

      expect(
        productImageRepository.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      const error = new Error("database error");

      productImageRepository.create.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.create({
          sessionId: "session-1",
          product_id: "product-1",
          data: originalData,
          contentType: "image/jpeg",
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("update", () => {
  it("should update the position", async () => {
    productImageRepository.findById.mockResolvedValue(
      existingImage,
    );

    const updatedImage = {
      ...existingImage,
      position: 2,
    };

    productImageRepository.update.mockResolvedValue(
      updatedImage,
    );

    await expect(
      productImageService.update("image-1", {
        sessionId: "session-1",
        position: 2,
      }),
    ).resolves.toEqual({
      id: "image-1",
      product_id: "product-1",
      url: "https://images.maka.tg/products/product-1/image-1.webp",
      position: 2,
      created_at: existingImage.created_at,
    });

    expect(
      productImageRepository.update,
    ).toHaveBeenCalledWith("image-1", {
      position: 2,
    });
  });

  it("should reject a negative position", async () => {
  productImageRepository.findById.mockResolvedValue(
    existingImage,
  );

  await expect(
    productImageService.update("image-1", {
      sessionId: "session-1",
      position: -1,
    }),
  ).rejects.toMatchObject({
    code: Errors.PRODUCT_IMAGE_INVALID_POSITION.code,
  });

  expect(
    productImageRepository.update,
  ).not.toHaveBeenCalled();
});

it("should reject a non-integer position", async () => {
  productImageRepository.findById.mockResolvedValue(
    existingImage,
  );

  await expect(
    productImageService.update("image-1", {
      sessionId: "session-1",
      position: 1.5,
    }),
  ).rejects.toMatchObject({
    code: Errors.PRODUCT_IMAGE_INVALID_POSITION.code,
  });

  expect(
    productImageRepository.update,
  ).not.toHaveBeenCalled();
});

it("should reject NaN as position", async () => {
  productImageRepository.findById.mockResolvedValue(
    existingImage,
  );

  await expect(
    productImageService.update("image-1", {
      sessionId: "session-1",
      position: Number.NaN,
    }),
  ).rejects.toMatchObject({
    code: Errors.PRODUCT_IMAGE_INVALID_POSITION.code,
  });

  expect(
    productImageRepository.update,
  ).not.toHaveBeenCalled();
});

  it("should throw when the image does not exist", async () => {
    productImageRepository.findById.mockResolvedValue(
      undefined,
    );

    await expect(
      productImageService.update("unknown", {
        sessionId: "session-1",
        position: 1,
      }),
    ).rejects.toMatchObject({
      code: Errors.PRODUCT_IMAGE_NOT_FOUND.code,
    });

    expect(
      productImageRepository.update,
    ).not.toHaveBeenCalled();
  });

  it("should propagate repository update errors", async () => {
    productImageRepository.findById.mockResolvedValue(
      existingImage,
    );

    const error = new Error("database error");

    productImageRepository.update.mockRejectedValue(
      error,
    );

    await expect(
      productImageService.update("image-1", {
        sessionId: "session-1",
        position: 1,
      }),
    ).rejects.toThrow(error);
  });
});

  describe("reorder", () => {
    it("should reorder all product images", async () => {
      const images = [
        {
          id: "image-1",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-1.webp",
          position: 0,
          created_at: new Date(),
        },
        {
          id: "image-2",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-2.webp",
          position: 1,
          created_at: new Date(),
        },
        {
          id: "image-3",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-3.webp",
          position: 2,
          created_at: new Date(),
        },
      ];

      productImageRepository.findByProductId.mockResolvedValue(
        images,
      );

      const reorderedImages = [
        {
          ...images[2],
          position: 0,
        },
        {
          ...images[0],
          position: 1,
        },
        {
          ...images[1],
          position: 2,
        },
      ];

      productImageRepository.reorderPositions.mockResolvedValue(
        reorderedImages,
      );

      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          [
            "image-3",
            "image-1",
            "image-2",
          ],
        ),
      ).resolves.toEqual(
        reorderedImages.map((image) => ({
          id: image.id,
          product_id: image.product_id,
          url: `https://images.maka.tg/${image.storage_key}`,
          position: image.position,
          created_at: image.created_at,
        })),
      );

      expect(
        productImageRepository.findByProductId,
      ).toHaveBeenCalledWith("product-1");

      expect(
        productImageRepository.reorderPositions,
      ).toHaveBeenCalledWith(
        "product-1",
        [
          {
            id: "image-3",
            position: 0,
          },
          {
            id: "image-1",
            position: 1,
          },
          {
            id: "image-2",
            position: 2,
          },
        ],
      );
    });

    it("should reject an empty product_id", async () => {
      await expect(
        productImageService.reorder(
          "",
          "session-1",
          ["image-1"],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only product_id", async () => {
      await expect(
        productImageService.reorder(
          "   ",
          "session-1",
          ["image-1"],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should reject an empty image list", async () => {
      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          [],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID_ORDER.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should reject duplicate image ids", async () => {
      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          [
            "image-1",
            "image-1",
          ],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID_ORDER.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should reject when an image does not belong to the product", async () => {
      productImageRepository.findByProductId.mockResolvedValue([
        {
          id: "image-1",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-1.webp",
          position: 0,
          created_at: new Date(),
        },
      ]);

      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          [
            "image-1",
            "image-foreign",
          ],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID_ORDER.code,
      });

      expect(
        productImageRepository.reorderPositions,
      ).not.toHaveBeenCalled();
    });

    it("should reject when an existing image is missing from the list", async () => {
      productImageRepository.findByProductId.mockResolvedValue([
        {
          id: "image-1",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-1.webp",
          position: 0,
          created_at: new Date(),
        },
        {
          id: "image-2",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-2.webp",
          position: 1,
          created_at: new Date(),
        },
      ]);

      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          ["image-1"],
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID_ORDER.code,
      });

      expect(
        productImageRepository.reorderPositions,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository find errors", async () => {
      const error = new Error("Database error");

      productImageRepository.findByProductId.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          ["image-1"],
        ),
      ).rejects.toThrow("Database error");

      expect(
        productImageRepository.reorderPositions,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository reorder errors", async () => {
      const images = [
        {
          id: "image-1",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-1.webp",
          position: 0,
          created_at: new Date(),
        },
        {
          id: "image-2",
          product_id: "product-1",
          storage_key:
            "products/product-1/image-2.webp",
          position: 1,
          created_at: new Date(),
        },
      ];

      const error = new Error(
        "Database reorder error",
      );

      productImageRepository.findByProductId.mockResolvedValue(
        images,
      );

      productImageRepository.reorderPositions.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.reorder(
          "product-1",
          "session-1",
          [
            "image-2",
            "image-1",
          ],
        ),
      ).rejects.toThrow("Database reorder error");

      expect(
        productImageRepository.reorderPositions,
      ).toHaveBeenCalledWith(
        "product-1",
        [
          {
            id: "image-2",
            position: 0,
          },
          {
            id: "image-1",
            position: 1,
          },
        ],
      );
    });
  });

  describe("delete", () => {
    it("should delete the storage object and database row", async () => {
      productImageRepository.findById.mockResolvedValue(
        existingImage,
      );

      productImageRepository.delete.mockResolvedValue(1);

      await expect(
        productImageService.delete(
          "image-1",
          "session-1",
        ),
      ).resolves.toBeUndefined();

      expect(imageStorage.delete).toHaveBeenCalledWith(
        existingImage.storage_key,
      );

      expect(
        productImageRepository.delete,
      ).toHaveBeenCalledWith("image-1");
    });

    it("should throw when the image does not exist", async () => {
      productImageRepository.findById.mockResolvedValue(
        undefined,
      );

      await expect(
        productImageService.delete(
          "unknown",
          "session-1",
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_NOT_FOUND.code,
      });

      expect(
        imageStorage.delete,
      ).not.toHaveBeenCalled();

      expect(
        productImageRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it("should not delete the database row when storage deletion fails", async () => {
      productImageRepository.findById.mockResolvedValue(
        existingImage,
      );

      const error = new Error("storage error");

      imageStorage.delete.mockRejectedValue(error);

      await expect(
        productImageService.delete(
          "image-1",
          "session-1",
        ),
      ).rejects.toThrow(error);

      expect(
        productImageRepository.delete,
      ).not.toHaveBeenCalled();
    });

    it("should throw when repository deletes nothing", async () => {
      productImageRepository.findById.mockResolvedValue(
        existingImage,
      );

      productImageRepository.delete.mockResolvedValue(0);

      await expect(
        productImageService.delete(
          "image-1",
          "session-1",
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_NOT_FOUND.code,
      });
    });
  });

  describe("deleteByProductId", () => {
    it("should delete all storage objects and database rows", async () => {
      const images = [
        existingImage,
        {
          ...existingImage,
          id: "image-2",
          storage_key:
            "products/product-1/image-2.webp",
          position: 1,
        },
      ];

      productImageRepository.findByProductId.mockResolvedValue(
        images,
      );

      productImageRepository.deleteByProductId.mockResolvedValue(
        2,
      );

      await expect(
        productImageService.deleteByProductId(
          "product-1",
          "session-1",
        ),
      ).resolves.toBe(2);

      expect(imageStorage.delete).toHaveBeenNthCalledWith(
        1,
        "products/product-1/image-1.webp",
      );

      expect(imageStorage.delete).toHaveBeenNthCalledWith(
        2,
        "products/product-1/image-2.webp",
      );

      expect(
        productImageRepository.deleteByProductId,
      ).toHaveBeenCalledWith("product-1");
    });

    it("should return zero when the product has no images", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      await expect(
        productImageService.deleteByProductId(
          "product-1",
          "session-1",
        ),
      ).resolves.toBe(0);

      expect(
        productImageRepository.deleteByProductId,
      ).not.toHaveBeenCalled();

      expect(
        imageStorage.delete,
      ).not.toHaveBeenCalled();
    });

    it("should reject an empty product_id", async () => {
      await expect(
        productImageService.deleteByProductId(
          "",
          "session-1",
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });

      expect(
        productImageRepository.findByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should reject a whitespace-only product_id", async () => {
      await expect(
        productImageService.deleteByProductId(
          "   ",
          "session-1",
        ),
      ).rejects.toMatchObject({
        code: Errors.PRODUCT_IMAGE_INVALID.code,
      });
    });

    it("should trim product_id", async () => {
      productImageRepository.findByProductId.mockResolvedValue(
        [],
      );

      await productImageService.deleteByProductId(
        "  product-1  ",
        "session-1",
      );

      expect(
        productImageRepository.findByProductId,
      ).toHaveBeenCalledWith("product-1");
    });

    it("should propagate storage errors", async () => {
      productImageRepository.findByProductId.mockResolvedValue([
        existingImage,
      ]);

      const error = new Error("storage error");

      imageStorage.delete.mockRejectedValue(error);

      await expect(
        productImageService.deleteByProductId(
          "product-1",
          "session-1",
        ),
      ).rejects.toThrow(error);

      expect(
        productImageRepository.deleteByProductId,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      productImageRepository.findByProductId.mockRejectedValue(
        error,
      );

      await expect(
        productImageService.deleteByProductId(
          "product-1",
          "session-1",
        ),
      ).rejects.toThrow(error);
    });
  });
});
