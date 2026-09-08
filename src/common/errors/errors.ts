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

  EVENT_NOT_FOUND: {
    code: "EVENT_NOT_FOUND",
    message: "Event not found.",
    statusCode: 404,
  },
  INVALID_EVENT: {
    code: "INVALID_EVENT",
    message: "Invalid event.",
    statusCode: 400,
  },

  STORE_ALREADY_EXISTS: {
    code: "STORE_ALREADY_EXISTS",
    message: "User already has a store",
    statusCode: 409,
  },

  STORE_FORBIDDEN: {
    code: "STORE_FORBIDDEN",
    message: "You do not have permission to access this store",
    statusCode: 403,
  },

  INVALID_STORE: {
    code: "INVALID_STORE",
    message: "Invalid store data",
    statusCode: 400,
  },

  INVALID_STORE_STATUS_TRANSITION: {
    code: "INVALID_STORE_STATUS_TRANSITION",
    message: "Invalid store status transition",
    statusCode: 400,
  },

CATEGORY_NOT_FOUND: {
  code: "CATEGORY_NOT_FOUND",
  message: "Category not found",
  statusCode: 404,
},

CATEGORY_INACTIVE: {
  code: "CATEGORY_INACTIVE",
  message: "Category is inactive",
  statusCode: 400,
},

PRODUCT_FORBIDDEN: {
  code: "PRODUCT_FORBIDDEN",
  message: "You do not have permission to access this product",
  statusCode: 403,
},

INVALID_PRODUCT: {
  code: "INVALID_PRODUCT",
  message: "Invalid product data",
  statusCode: 400,
},


INVALID_PRODUCT_STATUS_TRANSITION: {
  code: "INVALID_PRODUCT_STATUS_TRANSITION",
  message: "Invalid product status transition",
  statusCode: 400,
},


} as const;
