import { describe, expect, it } from "vitest";
import sharp from "sharp";

import { SharpImageProcessor } from "../../src/image-processing/SharpImageProcessor.js";

describe("SharpImageProcessor", () => {
  const processor = new SharpImageProcessor();

  async function createTestImage(
    format: "jpeg" | "png" | "webp",
    width = 100,
    height = 100,
  ): Promise<Buffer> {
    const image = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: {
          r: 255,
          g: 0,
          b: 0,
        },
      },
    });

    if (format === "jpeg") {
      return image.jpeg().toBuffer();
    }

    if (format === "png") {
      return image.png().toBuffer();
    }

    return image.webp().toBuffer();
  }

  describe("supported formats", () => {
    it("should process JPEG images into WebP", async () => {
      const input = await createTestImage("jpeg");

      const result = await processor.process(
        input,
        "image/jpeg",
      );

      expect(result.contentType).toBe("image/webp");

      const metadata = await sharp(result.data).metadata();

      expect(metadata.format).toBe("webp");
    });

    it("should process PNG images into WebP", async () => {
      const input = await createTestImage("png");

      const result = await processor.process(
        input,
        "image/png",
      );

      expect(result.contentType).toBe("image/webp");

      const metadata = await sharp(result.data).metadata();

      expect(metadata.format).toBe("webp");
    });

    it("should process WebP images into WebP", async () => {
      const input = await createTestImage("webp");

      const result = await processor.process(
        input,
        "image/webp",
      );

      expect(result.contentType).toBe("image/webp");

      const metadata = await sharp(result.data).metadata();

      expect(metadata.format).toBe("webp");
    });
  });

  describe("resize", () => {
    it("should resize images so that the maximum dimension is 1600px", async () => {
      const input = await createTestImage(
        "jpeg",
        2400,
        1200,
      );

      const result = await processor.process(
        input,
        "image/jpeg",
      );

      const metadata = await sharp(result.data).metadata();

      expect(metadata.width).toBe(1600);
      expect(metadata.height).toBe(800);
    });

    it("should not enlarge images smaller than 1600px", async () => {
      const input = await createTestImage(
        "jpeg",
        800,
        600,
      );

      const result = await processor.process(
        input,
        "image/jpeg",
      );

      const metadata = await sharp(result.data).metadata();

      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    });

    it("should preserve the aspect ratio", async () => {
      const input = await createTestImage(
        "jpeg",
        2400,
        1600,
      );

      const result = await processor.process(
        input,
        "image/jpeg",
      );

      const metadata = await sharp(result.data).metadata();

      expect(metadata.width).toBe(1600);
      expect(metadata.height).toBe(1067);
    });
  });

  describe("validation", () => {
    it("should reject empty image data", async () => {
      await expect(
        processor.process(Buffer.alloc(0), "image/jpeg"),
      ).rejects.toThrow(
        "Image file cannot be empty",
      );
    });

    it("should reject images larger than 5 MB", async () => {
      const input = Buffer.alloc(5 * 1024 * 1024 + 1);

      await expect(
        processor.process(input, "image/jpeg"),
      ).rejects.toThrow(
        "Image file exceeds the maximum size of 5 MB",
      );
    });

    it("should reject unsupported content types", async () => {
      const input = Buffer.from("not-an-image");

      await expect(
        processor.process(input, "image/gif"),
      ).rejects.toThrow(
        "Unsupported image type. Only JPEG, PNG and WebP are allowed",
      );
    });
  });
});
