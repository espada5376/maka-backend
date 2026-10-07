import type { ImageStorage } from "../../src/storage/ImageStorage.js";

export class FakeImageStorage implements ImageStorage {
  uploaded: Array<{
    key: string;
    data: Buffer;
    contentType: string;
  }> = [];

  deleted: string[] = [];

  upload(
    key: string,
    data: Buffer,
    contentType: string,
  ): Promise<void> {
    this.uploaded.push({
      key,
      data,
      contentType,
    });

    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.deleted.push(key);

    return Promise.resolve();
  }

  getUrl(key: string): string {
    return `https://fake-images.test/${key}`;
  }
}
