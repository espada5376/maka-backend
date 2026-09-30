export const NotificationType = {
  NEW_ORDER_FOR_SELLER: "new_order_for_seller",
  NEW_ORDER_FOR_BUYER: "new_order_for_buyer",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
