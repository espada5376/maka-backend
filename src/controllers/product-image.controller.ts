import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  ProductImageParams,
  ReorderProductImagesBody,
} from "../common/http/validation/product-image.schemas.js";
import { ProductImageService } from "../services/product-image.service.js";

export class ProductImageController {
  constructor(
    private readonly productImageService: ProductImageService,
  ) {}

  async create(
    req: HttpRequest<ProductImageParams>,
    res: Response,
  ): Promise<void> {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: "IMAGE_REQUIRED",
          message: "Image file is required",
        },
      });
      return;
    }

    const image = await this.productImageService.create({
      sessionId: req.session.id,
      product_id: req.params.productId,
      data: req.file.buffer,
      contentType: req.file.mimetype,
    });

    sendSuccess(res, 201, image);
  }

  async reorder(
    req: HttpRequest<ProductImageParams, ReorderProductImagesBody>,
    res: Response,
  ): Promise<void> {
    const images = await this.productImageService.reorder(
      req.params.productId,
      req.session.id,
      req.body.imageIds,
    );

    sendSuccess(res, 200, images);
  }
}
