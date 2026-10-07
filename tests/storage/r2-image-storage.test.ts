import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-s3", async () => {
  const actual = await vi.importActual<
    typeof import("@aws-sdk/client-s3")
  >("@aws-sdk/client-s3");

  class MockS3Client {
    send = sendMock;
  }

  return {
    ...actual,
    S3Client: MockS3Client,
  };
});

import { R2ImageStorage } from "../../src/storage/R2ImageStorage.js";

describe("R2ImageStorage", () => {
  const config = {
    accountId: "test-account-id",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    bucketName: "maka-images",
    publicBaseUrl: "https://images.maka.tg",
  };

  let storage: R2ImageStorage;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});

    storage = new R2ImageStorage(config);
  });

  describe("upload", () => {
    it("should upload an object to R2", async () => {
      const data = Buffer.from("image-data");

      await storage.upload(
        "products/product-1/image-1.webp",
        data,
        "image/webp",
      );

      expect(sendMock).toHaveBeenCalledTimes(1);

      const command = sendMock.mock.calls[0][0];

      expect(command).toBeInstanceOf(PutObjectCommand);

      expect(command.input).toMatchObject({
        Bucket: "maka-images",
        Key: "products/product-1/image-1.webp",
        Body: data,
        ContentType: "image/webp",
      });
    });

    it("should propagate R2 upload errors", async () => {
      const error = new Error("R2 upload failed");

      sendMock.mockRejectedValueOnce(error);

      await expect(
        storage.upload(
          "products/product-1/image-1.webp",
          Buffer.from("image-data"),
          "image/webp",
        ),
      ).rejects.toThrow("R2 upload failed");
    });
  });

  describe("delete", () => {
    it("should delete an object from R2", async () => {
      await storage.delete(
        "products/product-1/image-1.webp",
      );

      expect(sendMock).toHaveBeenCalledTimes(1);

      const command = sendMock.mock.calls[0][0];

      expect(command).toBeInstanceOf(DeleteObjectCommand);

      expect(command.input).toMatchObject({
        Bucket: "maka-images",
        Key: "products/product-1/image-1.webp",
      });
    });

    it("should propagate R2 deletion errors", async () => {
      const error = new Error("R2 delete failed");

      sendMock.mockRejectedValueOnce(error);

      await expect(
        storage.delete(
          "products/product-1/image-1.webp",
        ),
      ).rejects.toThrow("R2 delete failed");
    });
  });

  describe("getUrl", () => {
    it("should return the public URL of an object", () => {
      expect(
        storage.getUrl(
          "products/product-1/image-1.webp",
        ),
      ).toBe(
        "https://images.maka.tg/products/product-1/image-1.webp",
      );
    });

    it("should remove the trailing slash from the public base URL", () => {
      const storageWithTrailingSlash = new R2ImageStorage({
        ...config,
        publicBaseUrl: "https://images.maka.tg/",
      });

      expect(
        storageWithTrailingSlash.getUrl(
          "products/product-1/image-1.webp",
        ),
      ).toBe(
        "https://images.maka.tg/products/product-1/image-1.webp",
      );
    });
  });
});
