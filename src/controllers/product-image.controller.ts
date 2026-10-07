import type { Request, Response, NextFunction } from "express";

import { ProductImageService } from "../services/product-image.service.js";

export class ProductImageController {
  constructor(
    private readonly productImageService: ProductImageService,
  ) {}

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Image file is required",
        });
        return;
      }

      const image =
  await this.productImageService.create({
    sessionId: req.session.id,
    product_id: req.params.productId,
    data: req.file.buffer,
    contentType: req.file.mimetype,
  });

      res.status(201).json({
        success: true,
        data: image,
      });
    } catch (error) {
      next(error);
    }
  }

  async reorder(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const images =
        await this.productImageService.reorder(
          req.params.productId,
          req.session.id,
          req.body.imageIds,
        );

      res.status(200).json({
        success: true,
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }
}
