import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { validateBody, validateParams, } from "../../http/validation/validate.js";
import { addCartItemSchema, cartItemIdParamsSchema, updateCartItemQuantitySchema, } from "../../http/validation/cart.schemas.js";
export function createCartRouter(cartController) {
    const router = Router();
    router.get("/", asyncHandler(cartController.getCart.bind(cartController)));
    router.post("/items", validateBody(addCartItemSchema), asyncHandler(cartController.addItem.bind(cartController)));
    router.patch("/items/:itemId", validateParams(cartItemIdParamsSchema), validateBody(updateCartItemQuantitySchema), asyncHandler(cartController.updateItemQuantity.bind(cartController)));
    router.delete("/items/:itemId", validateParams(cartItemIdParamsSchema), asyncHandler(cartController.removeItem.bind(cartController)));
    return router;
}
