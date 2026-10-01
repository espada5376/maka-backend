import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  Notification,
} from "../../src/database/repositories/notification.repository.js";

import type {
  NotificationDelivery,
} from "../../src/database/repositories/notification-delivery.repository.js";


import {
  NotificationType,
} from "../../src/notifications/types/notification-type.js";

import db from "../../src/database/knex.js";

import { NotificationDeliveryRepository } from "../../src/database/repositories/notification-delivery.repository.js";

import { WhatsAppProviderError } from "../../src/notifications/providers/whatsapp.provider.js";

import { NotificationRepository } from "../../src/database/repositories/notification.repository.js";

import { UserRepository } from "../../src/database/repositories/user.repository.js";

import { NotificationWorker } from "../../src/notifications/notification.worker.js";

import type {
  WhatsAppMessage,
  WhatsAppProvider,
} from "../../src/notifications/providers/whatsapp.provider.js";

import { cleanDatabase } from "../helpers/database.js";

describe("NotificationWorker", () => {
  let notificationDeliveryRepository: NotificationDeliveryRepository;
  let notificationRepository: NotificationRepository;
  let userRepository: UserRepository;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();

    notificationDeliveryRepository = new NotificationDeliveryRepository(db);

    notificationRepository = new NotificationRepository(db);

    userRepository = new UserRepository(db);
  });

  it("should send a pending notification through WhatsApp", async () => {
  const user = await userRepository.create({
    phone: "22890000000",
    name: "Test User",
  });

  const notification = await notificationRepository.create({
    user_id: user.id,
    type: NotificationType.NEW_ORDER_FOR_SELLER,
    title: "Nouvelle commande",
    body: "Vous avez reçu une nouvelle commande CMD-1042.",
    data: {
      order_reference: "CMD-1042",
      total_amount: 15000,
      currency: "FCFA",
    },
  });

  const delivery = await notificationDeliveryRepository.create({
    notification_id: notification.id,
  });

  const sentMessages: WhatsAppMessage[] = [];

  const whatsappProvider: WhatsAppProvider = {
    send: async (message) => {
      sentMessages.push(message);

      return {
        providerMessageId: "wamid.test-123",
      };
    },
  };

  const worker = new NotificationWorker(
    notificationDeliveryRepository,
    notificationRepository,
    userRepository,
    whatsappProvider,
  );

  const processed = await worker.processNext();

  expect(processed).toBe(true);

  expect(sentMessages).toHaveLength(1);
  expect(sentMessages[0]).toEqual({
    to: "22890000000",
    template: {
      name: "new_order_seller",
      language: "fr",
      variables: ["CMD-1042", "15000", "FCFA"],
    },
  });

  const updatedDelivery =
    await notificationDeliveryRepository.findById(
      delivery.id,
    );

  expect(updatedDelivery?.status).toBe("sent");
  expect(updatedDelivery?.provider_message_id).toBe(
    "wamid.test-123",
  );
  expect(updatedDelivery?.attempts).toBe(1);
});

  it("should return false when there is no pending delivery", async () => {
    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error("Provider should not be called");
      },
    };

    const worker = new NotificationWorker(
      notificationDeliveryRepository,
      notificationRepository,
      userRepository,
      whatsappProvider,
    );

    const processed = await worker.processNext();

    expect(processed).toBe(false);
  });

  it("should schedule a retry when WhatsApp sending fails", async () => {
    const user = await userRepository.create({
      phone: "22890000001",
      name: "Retry User",
    });

    const notification = await notificationRepository.create({
      user_id: user.id,
      type: NotificationType.NEW_ORDER_FOR_SELLER,
title: "Nouvelle commande",
body: "Vous avez reçu une nouvelle commande.",
data: {
  order_reference: "CMD-1042",
  total_amount: 15000,
  currency: "FCFA",
},
    });

    const delivery = await notificationDeliveryRepository.create({
      notification_id: notification.id,
    });

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error("WhatsApp temporarily unavailable");
      },
    };

    const worker = new NotificationWorker(
      notificationDeliveryRepository,
      notificationRepository,
      userRepository,
      whatsappProvider,
    );

    const processed = await worker.processNext();

    expect(processed).toBe(true);

    const updatedDelivery = await notificationDeliveryRepository.findById(
      delivery.id,
    );

    expect(updatedDelivery?.status).toBe("pending");
    expect(updatedDelivery?.attempts).toBe(1);
    expect(updatedDelivery?.processing_started_at).toBeNull();
    expect(updatedDelivery?.next_attempt_at).not.toBeNull();
    expect(updatedDelivery?.error_code).toBe("WHATSAPP_SEND_ERROR");
    expect(updatedDelivery?.error_message).toBe(
      "WhatsApp temporarily unavailable",
    );
  });

  it("should mark the delivery as failed after the maximum attempts", async () => {
    const user = await userRepository.create({
      phone: "22890000002",
      name: "Failed User",
    });

    const notification = await notificationRepository.create({
      user_id: user.id,
      type: NotificationType.NEW_ORDER_FOR_SELLER,
title: "Nouvelle commande",
body: "Vous avez reçu une nouvelle commande.",
data: {
  order_reference: "CMD-1042",
  total_amount: 15000,
  currency: "FCFA",
},
    });

    const delivery = await notificationDeliveryRepository.create({
      notification_id: notification.id,
    });

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error("WhatsApp unavailable");
      },
    };

    const worker = new NotificationWorker(
      notificationDeliveryRepository,
      notificationRepository,
      userRepository,
      whatsappProvider,
    );

    // Première tentative.
    await worker.processNext();

    let updatedDelivery = await notificationDeliveryRepository.findById(
      delivery.id,
    );

    expect(updatedDelivery?.status).toBe("pending");
    expect(updatedDelivery?.attempts).toBe(1);

    // Rendre le retry immédiatement disponible.
    await db("notification_deliveries").where({ id: delivery.id }).update({
      next_attempt_at: db.fn.now(),
    });

    // Deuxième tentative.
    await worker.processNext();

    updatedDelivery = await notificationDeliveryRepository.findById(
      delivery.id,
    );

    expect(updatedDelivery?.status).toBe("pending");
    expect(updatedDelivery?.attempts).toBe(2);

    // Rendre le retry immédiatement disponible.
    await db("notification_deliveries").where({ id: delivery.id }).update({
      next_attempt_at: db.fn.now(),
    });

    // Troisième et dernière tentative.
    await worker.processNext();

    updatedDelivery = await notificationDeliveryRepository.findById(
      delivery.id,
    );

    expect(updatedDelivery?.status).toBe("failed");
    expect(updatedDelivery?.attempts).toBe(3);
    expect(updatedDelivery?.processing_started_at).toBeNull();
    expect(updatedDelivery?.next_attempt_at).toBeNull();
    expect(updatedDelivery?.error_code).toBe("MAX_ATTEMPTS_EXCEEDED");
    expect(updatedDelivery?.error_message).toBe("WhatsApp unavailable");
  });

  it("should permanently fail when WhatsApp returns a permanent error", async () => {
    const user = await userRepository.create({
      phone: "22890000004",
      name: "Permanent Error User",
    });

    const notification = await notificationRepository.create({
      user_id: user.id,
      type: NotificationType.NEW_ORDER_FOR_SELLER,
title: "Nouvelle commande",
body: "Vous avez reçu une nouvelle commande.",
data: {
  order_reference: "CMD-1042",
  total_amount: 15000,
  currency: "FCFA",
},
    });

    const delivery = await notificationDeliveryRepository.create({
      notification_id: notification.id,
    });

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new WhatsAppProviderError(
          "Recipient phone number is invalid",
          "permanent",
          "INVALID_RECIPIENT",
        );
      },
    };

    const worker = new NotificationWorker(
      notificationDeliveryRepository,
      notificationRepository,
      userRepository,
      whatsappProvider,
    );

    const processed = await worker.processNext();

    expect(processed).toBe(true);

    const updatedDelivery = await notificationDeliveryRepository.findById(
      delivery.id,
    );

    expect(updatedDelivery?.status).toBe("failed");
    expect(updatedDelivery?.attempts).toBe(1);
    expect(updatedDelivery?.next_attempt_at).toBeNull();
    expect(updatedDelivery?.processing_started_at).toBeNull();
    expect(updatedDelivery?.error_code).toBe("INVALID_RECIPIENT");
    expect(updatedDelivery?.error_message).toBe(
      "Recipient phone number is invalid",
    );
  });

  
it("should permanently fail when the notification does not exist", async () => {
  const delivery: NotificationDelivery = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    notification_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    channel: "whatsapp",
    status: "sending",
    attempts: 1,
    provider_message_id: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
    failed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    processing_started_at: new Date(),
    next_attempt_at: null,
  };

  const claimPending = vi.fn().mockResolvedValue(delivery);

  const markFailed = vi.fn().mockResolvedValue({
    ...delivery,
    status: "failed",
    failed_at: new Date(),
    processing_started_at: null,
    next_attempt_at: null,
    error_code: "NOTIFICATION_NOT_FOUND",
    error_message:
      "Notification associated with delivery was not found.",
  });

  const mockDeliveryRepository = {
    claimPending,
    markFailed,
  } as unknown as NotificationDeliveryRepository;

  const mockNotificationRepository = {
    findById: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationRepository;

  const mockUserRepository = {
    findById: vi.fn(),
  } as unknown as UserRepository;

  const whatsappProvider: WhatsAppProvider = {
    send: vi.fn(),
  };

  const worker = new NotificationWorker(
    mockDeliveryRepository,
    mockNotificationRepository,
    mockUserRepository,
    whatsappProvider,
  );

  const processed = await worker.processNext();

  expect(processed).toBe(true);

  expect(
    mockNotificationRepository.findById,
  ).toHaveBeenCalledWith(
    delivery.notification_id,
  );

  expect(markFailed).toHaveBeenCalledWith(
    delivery.id,
    {
      error_code: "NOTIFICATION_NOT_FOUND",
      error_message:
        "Notification associated with delivery was not found.",
    },
  );

  expect(
    whatsappProvider.send,
  ).not.toHaveBeenCalled();
});


  
it("should permanently fail when the notification user does not exist", async () => {
  const delivery: NotificationDelivery = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    notification_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    channel: "whatsapp",
    status: "sending",
    attempts: 1,
    provider_message_id: null,
    sent_at: null,
    delivered_at: null,
    read_at: null,
    failed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    processing_started_at: new Date(),
    next_attempt_at: null,
  };

  const notification: Notification = {
    id: delivery.notification_id,
    user_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    type: NotificationType.NEW_ORDER_FOR_SELLER,
    title: "Nouvelle commande",
    body: "Vous avez reçu une nouvelle commande.",
    data: {
      order_reference: "CMD-1042",
      total_amount: 15000,
      currency: "FCFA",
    },
    read_at: null,
    created_at: new Date(),
  };

  const claimPending = vi.fn().mockResolvedValue(delivery);

  const markFailed = vi.fn().mockResolvedValue({
    ...delivery,
    status: "failed",
    failed_at: new Date(),
    processing_started_at: null,
    next_attempt_at: null,
    error_code: "USER_NOT_FOUND",
    error_message:
      "User associated with notification was not found.",
  });

  const mockDeliveryRepository = {
    claimPending,
    markFailed,
  } as unknown as NotificationDeliveryRepository;

  const mockNotificationRepository = {
    findById: vi.fn().mockResolvedValue(notification),
  } as unknown as NotificationRepository;

  const mockUserRepository = {
    findById: vi.fn().mockResolvedValue(undefined),
  } as unknown as UserRepository;

  const whatsappProvider: WhatsAppProvider = {
    send: vi.fn(),
  };

  const worker = new NotificationWorker(
    mockDeliveryRepository,
    mockNotificationRepository,
    mockUserRepository,
    whatsappProvider,
  );

  const processed = await worker.processNext();

  expect(processed).toBe(true);

  expect(
    mockNotificationRepository.findById,
  ).toHaveBeenCalledWith(
    delivery.notification_id,
  );

  expect(
    mockUserRepository.findById,
  ).toHaveBeenCalledWith(
    notification.user_id,
  );

  expect(markFailed).toHaveBeenCalledWith(
    delivery.id,
    {
      error_code: "USER_NOT_FOUND",
      error_message:
        "User associated with notification was not found.",
    },
  );

  expect(
    whatsappProvider.send,
  ).not.toHaveBeenCalled();
});

});
