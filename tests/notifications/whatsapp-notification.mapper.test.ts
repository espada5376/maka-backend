
import { describe, expect, it } from "vitest";

import {
  mapNotificationToWhatsAppTemplate,
} from "../../src/notifications/whatsapp-notification.mapper.js";

import {
  NotificationType,
} from "../../src/notifications/types/notification-type.js";

import type {
  Notification,
} from "../../src/database/repositories/notification.repository.js";

function createNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    type: NotificationType.NEW_ORDER_FOR_SELLER,
    title: "Nouvelle commande",
    body: "Vous avez reçu une nouvelle commande.",
    data: {
      order_id:
        "33333333-3333-3333-3333-333333333333",
      order_reference: "CMD-1042",
      total_amount: 15000,
      currency: "FCFA",
    },
    read_at: null,
    created_at: new Date(),
    ...overrides,
  };
}

describe("mapNotificationToWhatsAppTemplate", () => {
  it("maps a seller new-order notification to the new_order_seller template", () => {
    const notification = createNotification();

    const result =
      mapNotificationToWhatsAppTemplate(
        notification,
      );

    expect(result).toEqual({
      name: "new_order_seller",
      language: "fr",
      variables: [
        "CMD-1042",
        "15000",
        "FCFA",
      ],
    });
  });

  it("preserves the expected variable order", () => {
    const notification =
      createNotification({
        data: {
          order_reference: "CMD-9999",
          total_amount: 27500,
          currency: "FCFA",
        },
      });

    const result =
      mapNotificationToWhatsAppTemplate(
        notification,
      );

    expect(result).toMatchObject({
      variables: [
        "CMD-9999",
        "27500",
        "FCFA",
      ],
    });
  });

  it("accepts a string amount", () => {
    const notification =
      createNotification({
        data: {
          order_reference: "CMD-1000",
          total_amount: "15000",
          currency: "FCFA",
        },
      });

    const result =
      mapNotificationToWhatsAppTemplate(
        notification,
      );

    expect(result).toMatchObject({
      variables: [
        "CMD-1000",
        "15000",
        "FCFA",
      ],
    });
  });

  it("throws when order_reference is missing", () => {
    const notification =
      createNotification({
        data: {
          total_amount: 15000,
          currency: "FCFA",
        },
      });

    expect(() =>
      mapNotificationToWhatsAppTemplate(
        notification,
      ),
    ).toThrow(
      'Notification data field "order_reference" is required for WhatsApp delivery.',
    );
  });

  it("throws when total_amount is missing", () => {
    const notification =
      createNotification({
        data: {
          order_reference: "CMD-1042",
          currency: "FCFA",
        },
      });

    expect(() =>
      mapNotificationToWhatsAppTemplate(
        notification,
      ),
    ).toThrow(
      'Notification data field "total_amount" is required for WhatsApp delivery.',
    );
  });

  it("throws when currency is missing", () => {
    const notification =
      createNotification({
        data: {
          order_reference: "CMD-1042",
          total_amount: 15000,
        },
      });

    expect(() =>
      mapNotificationToWhatsAppTemplate(
        notification,
      ),
    ).toThrow(
      'Notification data field "currency" is required for WhatsApp delivery.',
    );
  });

  it("throws when the notification type is not supported", () => {
    const notification =
      createNotification({
        type: "unknown_notification_type",
      });

    expect(() =>
      mapNotificationToWhatsAppTemplate(
        notification,
      ),
    ).toThrow(
      'Notification type "unknown_notification_type" is not supported for WhatsApp delivery.',
    );
  });
});





