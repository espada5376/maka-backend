export const Errors = {
    SESSION_NOT_FOUND: {
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
        statusCode: 404,
    },
    SESSION_EXPIRED: {
        code: "SESSION_EXPIRED",
        message: "Session has expired",
        statusCode: 401,
    },
    CART_NOT_FOUND: {
        code: "CART_NOT_FOUND",
        message: "Cart not found",
        statusCode: 404,
    },
    CART_EMPTY: {
        code: "CART_EMPTY",
        message: "Cart is empty",
        statusCode: 400,
    },
    PRODUCT_NOT_FOUND: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
        statusCode: 404,
    },
    PRODUCT_UNAVAILABLE: {
        code: "PRODUCT_UNAVAILABLE",
        message: "One or more products are unavailable",
        statusCode: 400,
    },
    PRODUCT_INACTIVE: {
        code: "PRODUCT_INACTIVE",
        message: "One or more products are inactive",
        statusCode: 400,
    },
    STORE_NOT_FOUND: {
        code: "STORE_NOT_FOUND",
        message: "Store not found",
        statusCode: 404,
    },
    STORE_INACTIVE: {
        code: "STORE_INACTIVE",
        message: "Store is inactive",
        statusCode: 400,
    },
    MULTIPLE_STORES_IN_CART: {
        code: "MULTIPLE_STORES_IN_CART",
        message: "All cart items must belong to the same store",
        statusCode: 400,
    },
    INVALID_CART_ITEM_QUANTITY: {
        code: "INVALID_CART_ITEM_QUANTITY",
        message: "Cart item quantity must be greater than zero",
        statusCode: 400,
    },
    IDEMPOTENCY_KEY_CONFLICT: {
        code: "IDEMPOTENCY_KEY_CONFLICT",
        message: "This idempotency key is already associated with another order",
        statusCode: 409,
    },
    ORDER_NOT_FOUND: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
        statusCode: 404,
    },
    INVALID_ORDER_STATUS_TRANSITION: {
        code: "INVALID_ORDER_STATUS_TRANSITION",
        message: "Invalid order status transition",
        statusCode: 400,
    },
    CURRENCY_MISMATCH: {
        code: "CURRENCY_MISMATCH",
        message: "Store currency does not match the platform currency",
        statusCode: 400,
    },
};
