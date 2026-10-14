import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  CreateProductBody,
  ProductCategoryIdParams,
  ProductIdParams,
  ProductStoreIdParams,
  SetProductAvailabilityBody,
  UpdateProductBody,
} from "../common/http/validation/product.schemas.js";
import { ProductService } from "../services/product.service.js";

export class ProductController {
  constructor(
    private readonly productService: ProductService,
  ) {}

  async create(
    req: HttpRequest<{}, CreateProductBody>,
    res: Response,
  ): Promise<void> {
    const product = await this.productService.create(
      req.session.id,
      req.body,
    );

    sendSuccess(res, 201, product);
  }

  async getById(
    req: HttpRequest<ProductIdParams>,
    res: Response,
  ): Promise<void> {
    const product = await this.productService.getById(
      req.params.id,
    );

    sendSuccess(res, 200, product);
  }

  async getByStore(
    req: HttpRequest<ProductStoreIdParams>,
    res: Response,
  ): Promise<void> {
    const products = await this.productService.getByStore(
      req.session.id,
      req.params.storeId,
    );

    sendSuccess(res, 200, products);
  }

  async getAvailableByStore(
    req: HttpRequest<ProductStoreIdParams>,
    res: Response,
  ): Promise<void> {
    const products =
      await this.productService.getAvailableByStore(
        req.params.storeId,
      );

    sendSuccess(res, 200, products);
  }

  async getByCategory(
    req: HttpRequest<ProductCategoryIdParams>,
    res: Response,
  ): Promise<void> {
    const products = await this.productService.getByCategory(
      req.params.categoryId,
    );

    sendSuccess(res, 200, products);
  }

  async update(
    req: HttpRequest<ProductIdParams, UpdateProductBody>,
    res: Response,
  ): Promise<void> {
    const product = await this.productService.update(
      req.session.id,
      req.params.id,
      req.body,
    );

    sendSuccess(res, 200, product);
  }

  async setAvailability(
    req: HttpRequest<
      ProductIdParams,
      SetProductAvailabilityBody
    >,
    res: Response,
  ): Promise<void> {
    const product =
      await this.productService.setAvailability(
        req.session.id,
        req.params.id,
        req.body.availability,
      );

    sendSuccess(res, 200, product);
  }

  async archive(
    req: HttpRequest<ProductIdParams>,
    res: Response,
  ): Promise<void> {
    const product = await this.productService.archive(
      req.session.id,
      req.params.id,
    );

    sendSuccess(res, 200, product);
  }

  async unarchive(
    req: HttpRequest<ProductIdParams>,
    res: Response,
  ): Promise<void> {
    const product = await this.productService.unarchive(
      req.session.id,
      req.params.id,
    );

    sendSuccess(res, 200, product);
  }
}
