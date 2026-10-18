import { Router } from "express";

import { OrderController } from "../../../controllers/order.controller.js";
import { asyncHandler } from "../../http/async-handler.js";
import { validateIdempotencyKey } from "../../middlewares/idempotency-key.middleware.js";
import {
  validateBody,
  validateParams,
} from "../../http/validation/validate.js";
import {
  createOrderSchema,
  createDirectOrderSchema,
  orderIdParamsSchema,
  storeOrderParamsSchema,
  storeOrderDetailParamsSchema,
  updateOrderStatusSchema,
} from "../../http/validation/order.schemas.js";

export function createOrderRouter(orderController: OrderController) {
  const router = Router();

  router.post(
    "/orders",
    validateIdempotencyKey,
    validateBody(createOrderSchema),
    asyncHandler(orderController.createFromCart.bind(orderController)),
  );

  router.post(
    "/orders/direct",
    validateIdempotencyKey,
    validateBody(createDirectOrderSchema),
    asyncHandler(orderController.createDirect.bind(orderController)),
  );

  router.get(
    "/orders",
    asyncHandler(
      orderController.getForCurrentBuyer.bind(orderController),
    ),
  );

  router.get(
    "/orders/:orderId",
    validateParams(orderIdParamsSchema),
    asyncHandler(
      orderController.getForCurrentBuyerById.bind(orderController),
    ),
  );

  router.get(
    "/stores/:storeId/orders",
    validateParams(storeOrderParamsSchema),
    asyncHandler(orderController.getForSeller.bind(orderController)),
  );

  router.patch(
    "/stores/:storeId/orders/:orderId/status",
    validateParams(storeOrderDetailParamsSchema),
    validateBody(updateOrderStatusSchema),
    asyncHandler(
      orderController.updateStatusBySeller.bind(orderController),
    ),
  );

  return router;
}
