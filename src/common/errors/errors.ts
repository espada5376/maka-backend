export const Errors = {
  SESSION_NOT_FOUND: {
    code: "SESSION_NOT_FOUND",
    message: "Session not found",
    statusCode: 404,
  },

    ADMIN_UNAUTHORIZED: {
    code: "ADMIN_UNAUTHORIZED",
    message: "Administrator authorization required",
    statusCode: 403,
  },

USER_UNAUTHORIZED: {
  code: "USER_UNAUTHORIZED",
  message: "User authentication required",
  statusCode: 401,
},

  CATEGORY_INACTIVE: {
    code: "CATEGORY_INACTIVE",
    message: "Category is inactive",
    statusCode: 409,
  },

  CART_NOT_FOUND: {
    code: "CART_NOT_FOUND",
    message: "Cart not found",
    statusCode: 404,
  },

  CART_ITEM_NOT_FOUND: {
    code: "CART_ITEM_NOT_FOUND",
    message: "Cart item not found",
    statusCode: 404,
  },

  CART_EMPTY: {
    code: "CART_EMPTY",
    message: "Cart is empty",
    statusCode: 400,
  },

  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    message: "Session has expired",
    statusCode: 401,
  },

  INVALID_SESSION_EXPIRATION: {
    code: "INVALID_SESSION_EXPIRATION",
    message: "Session expiration must be a valid future date",
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

    ORDER_STATUS_CONFLICT: {
    code: "ORDER_STATUS_CONFLICT",
    message: "Order status changed concurrently; reload and try again",
    statusCode: 409,
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
    message: "category not found",
    statusCode: 404,
  },

  CATEGORY_INVALID_NAME: {
    code: "CATEGORY_INVALID_NAME",
    message: "Invalid category name",
    statusCode: 400,
  },

  CATEGORY_INVALID_SLUG: {
    code: "CATEGORY_INVALID_SLUG",
    message: "Invalid category slug",
    statusCode: 400,
  },

  CATEGORY_SLUG_ALREADY_EXISTS: {
    code: "CATEGORY_SLUG_ALREADY_EXISTS",
    message: "Category slug already exists",
    statusCode: 409,
  },

  CATEGORY_PARENT_NOT_FOUND: {
    code: "CATEGORY_PARENT_NOT_FOUND",
    message: "Parent category not found",
    statusCode: 404,
  },

  CATEGORY_PARENT_INACTIVE: {
    code: "CATEGORY_PARENT_INACTIVE",
    message: "Parent category is inactive",
    statusCode: 400,
  },

  CATEGORY_INVALID_PARENT: {
    code: "CATEGORY_INVALID_PARENT",
    message: "Invalid category parent",
    statusCode: 400,
  },

  CATEGORY_MAX_DEPTH_REACHED: {
    code: "CATEGORY_MAX_DEPTH_REACHED",
    message: "Category hierarchy cannot exceed two levels",
    statusCode: 400,
  },

  CATEGORY_INVALID_STATUS: {
    code: "CATEGORY_INVALID_STATUS",
    message: "Invalid category status",
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

  NOTIFICATION_NOT_FOUND: {
    code: "NOTIFICATION_NOT_FOUND",
    message: "Notification not found",
    statusCode: 404,
  },

  INVALID_USER_ID: {
    code: "INVALID_USER_ID",
    message: "Invalid user ID",
    statusCode: 400,
  },

  INVALID_TYPE: {
    code: "INVALID_TYPE",
    message: "Invalid notification type",
    statusCode: 400,
  },

  INVALID_TITLE: {
    code: "INVALID_TITLE",
    message: "Invalid notification title",
    statusCode: 400,
  },

  INVALID_BODY: {
    code: "INVALID_BODY",
    message: "Invalid notification body",
    statusCode: 400,
  },

  INVALID_DATA: {
    code: "INVALID_DATA",
    message: "Invalid notification data",
    statusCode: 400,
  },

  INSIGHT_NOT_FOUND: {
    code: "INSIGHT_NOT_FOUND",
    message: "Insight not found",
    statusCode: 404,
  },

  INVALID_STORE_ID: {
    code: "INVALID_STORE_ID",
    message: "Invalid store ID",
    statusCode: 400,
  },

  INVALID_INSIGHT_TYPE: {
    code: "INVALID_TYPE",
    message: "Invalid insight type",
    statusCode: 400,
  },

  INVALID_INSIGHT_TITLE: {
    code: "INVALID_TITLE",
    message: "Invalid insight title",
    statusCode: 400,
  },

  INVALID_DESCRIPTION: {
    code: "INVALID_DESCRIPTION",
    message: "Invalid insight description",
    statusCode: 400,
  },

  INVALID_CONFIDENCE: {
    code: "INVALID_CONFIDENCE",
    message: "Invalid insight confidence",
    statusCode: 400,
  },

  INVALID_INSIGHT_DATA: {
    code: "INVALID_DATA",
    message: "Invalid insight data",
    statusCode: 400,
  },

  INVALID_STATUS: {
    code: "INVALID_STATUS",
    message: "Invalid insight status",
    statusCode: 400,
  },

  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    message: "User not found",
    statusCode: 404,
  },

  INVALID_NAME: {
    code: "INVALID_NAME",
    message: "Invalid user name",
    statusCode: 400,
  },

  INVALID_PHONE: {
    code: "INVALID_PHONE",
    message: "Invalid phone number",
    statusCode: 400,
  },

  PHONE_ALREADY_EXISTS: {
    code: "PHONE_ALREADY_EXISTS",
    message: "A user already exists with this phone number",
    statusCode: 409,
  },

  INVALID_USER_STATUS: {
    code: "INVALID_USER_STATUS",
    message: "Invalid user status",
    statusCode: 400,
  },

  OTP_NOT_FOUND: {
    code: "OTP_NOT_FOUND",
    message: "No active OTP found",
    statusCode: 404,
  },

  OTP_EXPIRED: {
    code: "OTP_EXPIRED",
    message: "OTP has expired",
    statusCode: 400,
  },

  OTP_INVALID: {
    code: "OTP_INVALID",
    message: "Invalid OTP",
    statusCode: 400,
  },

  OTP_MAX_ATTEMPTS: {
    code: "OTP_MAX_ATTEMPTS",
    message: "Maximum OTP attempts exceeded",
    statusCode: 429,
  },

  PRODUCT_IMAGE_NOT_FOUND: {
    code: "PRODUCT_IMAGE_NOT_FOUND",
    message: "Product image not found",
    statusCode: 404,
  },

  PRODUCT_IMAGE_INVALID: {
    code: "PRODUCT_IMAGE_INVALID",
    message: "Invalid product image",
    statusCode: 400,
  },

  PRODUCT_IMAGE_INVALID_POSITION: {
    code: "PRODUCT_IMAGE_INVALID_POSITION",
    message: "Image position must be a non-negative integer",
    statusCode: 400,
  },

  PRODUCT_IMAGE_MAX_REACHED: {
    code: "PRODUCT_IMAGE_MAX_REACHED",
    message: "A product cannot have more than 4 images",
    statusCode: 400,
  },

  PRODUCT_IMAGE_INVALID_ORDER: {
    code: "PRODUCT_IMAGE_INVALID_ORDER",
    message: "Invalid product image order",
    statusCode: 400,
  },

  IDEMPOTENCY_KEY_REQUIRED: {
    code: "IDEMPOTENCY_KEY_REQUIRED",
    message: "The Idempotency-Key header is required and must not exceed 100 characters",
    statusCode: 400,
  },

  INVALID_REQUEST_BODY: {
    code: "INVALID_REQUEST_BODY",
    message: "Request body is invalid",
    statusCode: 400,
  },

  INVALID_REQUEST_PARAMS: {
    code: "INVALID_REQUEST_PARAMS",
    message: "Request parameters are invalid",
    statusCode: 400,
  },

  INVALID_REQUEST_QUERY: {
    code: "INVALID_REQUEST_QUERY",
    message: "Request query parameters are invalid",
    statusCode: 400,
  },
} as const;
