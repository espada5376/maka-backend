import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  CreateOrderBody,
  CreateDirectOrderBody,
  OrderIdParams,
  StoreOrderParams,
  StoreOrderDetailParams,
  UpdateOrderStatusBody,
} from "../common/http/validation/order.schemas.js";
import type { OrderStatus } from "../database/repositories/order.repository.js";
import { OrderService } from "../services/order.service.js";

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  async createFromCart(
    req: HttpRequest<{}, CreateOrderBody>,
    res: Response,
  ): Promise<void> {
    const order = await this.orderService.createFromCart(req.session.id, {
      ...req.body,
      idempotencyKey: req.get("Idempotency-Key")!,
    });

    sendSuccess(res, 201, order);
  }

  async createDirect(
    req: HttpRequest<{}, CreateDirectOrderBody>,
    res: Response,
  ): Promise<void> {
    const order = await this.orderService.createDirect(req.session.id, {
      ...req.body,
      idempotencyKey: req.get("Idempotency-Key")!,
    });

    sendSuccess(res, 201, order);
  }

  async getForCurrentBuyer(
    req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const orders = await this.orderService.getForCurrentBuyer(
      req.session.id,
    );

    sendSuccess(res, 200, orders);
  }

  async getForCurrentBuyerById(
    req: HttpRequest<OrderIdParams>,
    res: Response,
  ): Promise<void> {
    const order = await this.orderService.getForCurrentBuyerById(
      req.session.id,
      req.params.orderId,
    );

    sendSuccess(res, 200, order);
  }

  async getForSeller(
    req: HttpRequest<StoreOrderParams>,
    res: Response,
  ): Promise<void> {
    const orders = await this.orderService.getForSeller(
      req.session.id,
      req.params.storeId,
    );

    sendSuccess(res, 200, orders);
  }

  async updateStatusBySeller(
    req: HttpRequest<
      StoreOrderDetailParams,
      UpdateOrderStatusBody
    >,
    res: Response,
  ): Promise<void> {
    const order = await this.orderService.updateStatusBySeller(
      req.session.id,
      req.params.storeId,
      req.params.orderId,
      req.body.status as OrderStatus,
    );

    sendSuccess(res, 200, order);
  }
}
