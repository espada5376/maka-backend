
import {
  NotificationType,
} from "./types/notification-type.js";

import type {
  WhatsAppTemplate,
} from "./providers/whatsapp.provider.js";

import type {
  Notification,
} from "../database/repositories/notification.repository.js";

export function mapNotificationToWhatsAppTemplate(
  notification: Notification,
): WhatsAppTemplate {
  switch (notification.type) {
    case NotificationType.NEW_ORDER_FOR_SELLER:
      return {
        name: "new_order_seller",
        language: "fr",
        variables: [
          getRequiredString(
            notification.data.order_reference,
            "order_reference",
          ),
          getRequiredString(
            notification.data.total_amount,
            "total_amount",
          ),
          getRequiredString(
            notification.data.currency,
            "currency",
          ),
        ],
      };

    default:
      throw new Error(
        `Notification type "${notification.type}" is not supported for WhatsApp delivery.`,
      );
  }
}

function getRequiredString(
  value: unknown,
  fieldName: string,
): string {
  if (
    (typeof value !== "string" &&
      typeof value !== "number") ||
    String(value).trim() === ""
  ) {
    throw new Error(
      `Notification data field "${fieldName}" is required for WhatsApp delivery.`,
    );
  }

  return String(value);
}



