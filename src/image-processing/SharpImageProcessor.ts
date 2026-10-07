import sharp from "sharp";

import type {
  ImageProcessor,
  ProcessedImage,
} from "./ImageProcessor.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;

const SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class SharpImageProcessor implements ImageProcessor {
  async process(
    data: Buffer,
    contentType: string,
  ): Promise<ProcessedImage> {
    if (data.length === 0) {
      throw new Error("Image file cannot be empty");
    }

    if (data.length > MAX_FILE_SIZE) {
      throw new Error("Image file exceeds the maximum size of 5 MB");
    }

    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
      throw new Error(
        "Unsupported image type. Only JPEG, PNG and WebP are allowed",
      );
    }

    const processedImage = await sharp(data)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
      })
      .toBuffer();

    return {
      data: processedImage,
      contentType: "image/webp",
    };
  }
}
