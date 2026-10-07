export interface ProcessedImage {
  data: Buffer;
  contentType: "image/webp";
}

export interface ImageProcessor {
  process(
    data: Buffer,
    contentType: string,
  ): Promise<ProcessedImage>;
}
