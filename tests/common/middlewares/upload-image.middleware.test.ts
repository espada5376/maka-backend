import express from "express";
import { describe, expect, it } from "vitest";

import { uploadImage } from "../../../src/common/middlewares/upload-image.middleware.js";

describe("uploadImage middleware", () => {
  it("should accept a single image file", async () => {
    const app = express();

    app.post(
      "/upload",
      uploadImage.single("image"),
      (req, res) => {
        res.status(200).json({
          filename: req.file?.originalname,
          mimetype: req.file?.mimetype,
          size: req.file?.size,
        });
      },
    );

    const formData = new FormData();

    formData.append(
      "image",
      new Blob(["fake-image-content"], {
        type: "image/jpeg",
      }),
      "photo.jpg",
    );

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Could not determine server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        filename: "photo.jpg",
        mimetype: "image/jpeg",
        size: 18,
      });
    } finally {
      server.close();
    }
  });

  it("should reject files larger than 5 MB", async () => {
  const app = express();

  app.post(
    "/upload",
    uploadImage.single("image"),
    (_req, res) => {
      res.status(200).json({
        success: true,
      });
    },
  );

  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(400).json({
        code: error.code,
      });
    },
  );

  const formData = new FormData();

  const oversizedFile = new Uint8Array(
    5 * 1024 * 1024 + 1,
  );

  formData.append(
    "image",
    new Blob([oversizedFile], {
      type: "image/jpeg",
    }),
    "large-photo.jpg",
  );

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Could not determine server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      code: "LIMIT_FILE_SIZE",
    });
  } finally {
    server.close();
  }
});


});
