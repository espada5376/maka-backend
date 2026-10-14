import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  AddCartItemBody,
  CartItemIdParams,
  UpdateCartItemQuantityBody,
} from "../common/http/validation/cart.schemas.js";
import { CartService } from "../services/cart.service.js";

export class CartController {
  constructor(private readonly cartService: CartService) {}

  async getCart(req: HttpRequest, res: Response): Promise<void> {
    const cart = await this.cartService.getCart(req.session.id);

    sendSuccess(res, 200, cart);
  }

  async addItem(
    req: HttpRequest<{}, AddCartItemBody>,
    res: Response,
  ): Promise<void> {
    const item = await this.cartService.addItem(
      req.session.id,
      req.body.product_id,
      req.body.quantity,
    );

    sendSuccess(res, 201, item);
  }

  async updateItemQuantity(
    req: HttpRequest<CartItemIdParams, UpdateCartItemQuantityBody>,
    res: Response,
  ): Promise<void> {
    const item = await this.cartService.updateItemQuantity(
      req.session.id,
      req.params.itemId,
      req.body.quantity,
    );

    sendSuccess(res, 200, item);
  }

  async removeItem(
    req: HttpRequest<CartItemIdParams>,
    res: Response,
  ): Promise<void> {
    await this.cartService.removeItem(req.session.id, req.params.itemId);

    res.status(204).end();
  }
}
