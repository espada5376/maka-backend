import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  NotificationDeliveryRepository,
  MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
} from "../../../src/database/repositories/notification-delivery.repository";

import {
  NotificationRepository,
} from "../../../src/database/repositories/notification.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import { cleanDatabase } from "../../helpers/database";

describe("NotificationDeliveryRepository", () => {
  const notificationDeliveryRepository =
    new NotificationDeliveryRepository(db);

  const notificationRepository =
    new NotificationRepository(db);

  const userRepository =
    new UserRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createUser(
    name = "Notification Delivery User",
  ) {
    return userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name,
    });
  }

  async function createNotification(
    userId: string,
  ) {
    return notificationRepository.create({
      user_id: userId,
      type: "order_update",
      title: "Commande mise à jour",
      body: "Votre commande a été mise à jour.",
    });
  }

  async function createDelivery() {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const delivery =
      await notificationDeliveryRepository.create({
        notification_id: notification.id,
      });

    return {
      user,
      notification,
      delivery,
    };
  }

  it("should create a WhatsApp notification delivery", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const delivery =
      await notificationDeliveryRepository.create({
        notification_id: notification.id,
      });

    expect(delivery).toBeDefined();
    expect(delivery.id).toBeDefined();
    expect(delivery.notification_id).toBe(
      notification.id,
    );
    expect(delivery.channel).toBe("whatsapp");
    expect(delivery.status).toBe("pending");
    expect(delivery.attempts).toBe(0);
    expect(delivery.provider_message_id).toBeNull();
    expect(delivery.sent_at).toBeNull();
    expect(delivery.delivered_at).toBeNull();
    expect(delivery.read_at).toBeNull();
    expect(delivery.failed_at).toBeNull();
    expect(delivery.error_code).toBeNull();
    expect(delivery.error_message).toBeNull();
    expect(delivery.created_at).toBeDefined();
    expect(delivery.updated_at).toBeDefined();
  });

  it("should find a delivery by id", async () => {
    const { delivery } =
      await createDelivery();

    const found =
      await notificationDeliveryRepository.findById(
        delivery.id,
      );

    expect(found).toBeDefined();
    expect(found?.id).toBe(delivery.id);
  });

  it("should return undefined for an unknown id", async () => {
    const found =
      await notificationDeliveryRepository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(found).toBeUndefined();
  });

  it("should find a delivery by notification id", async () => {
    const { notification, delivery } =
      await createDelivery();

    const found =
      await notificationDeliveryRepository.findByNotificationId(
        notification.id,
      );

    expect(found).toBeDefined();
    expect(found?.id).toBe(delivery.id);
  });

  it("should return undefined when no delivery exists for a notification", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const found =
      await notificationDeliveryRepository.findByNotificationId(
        notification.id,
      );

    expect(found).toBeUndefined();
  });

  it("should reject a delivery for a nonexistent notification", async () => {
    await expect(
      notificationDeliveryRepository.create({
        notification_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should prevent two deliveries for the same notification and channel", async () => {
    const { notification } =
      await createDelivery();

    await expect(
      notificationDeliveryRepository.create({
        notification_id: notification.id,
      }),
    ).rejects.toThrow();
  });

  it("should mark a pending delivery as sending", async () => {
    const { delivery } =
      await createDelivery();

    const updated =
      await notificationDeliveryRepository.markSending(
        delivery.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("sending");
    expect(updated?.attempts).toBe(1);
  });

  it("should increment attempts when marking a delivery as sending", async () => {
    const { delivery } =
      await createDelivery();

    const first =
      await notificationDeliveryRepository.markSending(
        delivery.id,
      );

    expect(first?.attempts).toBe(1);

    const second =
      await notificationDeliveryRepository.markSending(
        delivery.id,
      );

    expect(second).toBeUndefined();
  });

  it("should not mark a non-pending delivery as sending", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    const updated =
      await notificationDeliveryRepository.markSending(
        delivery.id,
      );

    expect(updated).toBeUndefined();
  });

  it("should mark a delivery as sent", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    const updated =
      await notificationDeliveryRepository.markSent(
        delivery.id,
        {
          provider_message_id: "wamid.test-123",
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("sent");
    expect(updated?.provider_message_id).toBe(
      "wamid.test-123",
    );
    expect(updated?.sent_at).not.toBeNull();
  });

  it("should mark a delivery as delivered", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    await notificationDeliveryRepository.markSent(
      delivery.id,
      {
        provider_message_id: "wamid.test-123",
      },
    );

    const updated =
      await notificationDeliveryRepository.markDelivered(
        delivery.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("delivered");
    expect(updated?.delivered_at).not.toBeNull();
  });

  it("should mark a delivery as read", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    await notificationDeliveryRepository.markSent(
      delivery.id,
      {
        provider_message_id: "wamid.test-123",
      },
    );

    await notificationDeliveryRepository.markDelivered(
      delivery.id,
    );

    const updated =
      await notificationDeliveryRepository.markRead(
        delivery.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("read");
    expect(updated?.read_at).not.toBeNull();
  });

  it("should mark a delivery as failed", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    const updated =
      await notificationDeliveryRepository.markFailed(
        delivery.id,
        {
          error_code: "WHATSAPP_API_ERROR",
          error_message:
            "WhatsApp API rejected the message.",
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("failed");
    expect(updated?.failed_at).not.toBeNull();
    expect(updated?.error_code).toBe(
      "WHATSAPP_API_ERROR",
    );
    expect(updated?.error_message).toBe(
      "WhatsApp API rejected the message.",
    );
  });

  it("should allow a failed delivery to retain its attempt count", async () => {
    const { delivery } =
      await createDelivery();

    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

    const updated =
      await notificationDeliveryRepository.markFailed(
        delivery.id,
        {
          error_code: "NETWORK_ERROR",
          error_message: "Network error.",
        },
      );

    expect(updated?.attempts).toBe(1);
  });

  it("should return undefined when marking an unknown delivery as sending", async () => {
    const updated =
      await notificationDeliveryRepository.markSending(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(updated).toBeUndefined();
  });

  it("should return undefined when marking an unknown delivery as sent", async () => {
    const updated =
      await notificationDeliveryRepository.markSent(
        "00000000-0000-0000-0000-000000000000",
        {
          provider_message_id: "wamid.test-123",
        },
      );

    expect(updated).toBeUndefined();
  });

  it("should return undefined when marking an unknown delivery as delivered", async () => {
    const updated =
      await notificationDeliveryRepository.markDelivered(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(updated).toBeUndefined();
  });

  it("should return undefined when marking an unknown delivery as read", async () => {
    const updated =
      await notificationDeliveryRepository.markRead(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(updated).toBeUndefined();
  });

  it("should return undefined when marking an unknown delivery as failed", async () => {
    const updated =
      await notificationDeliveryRepository.markFailed(
        "00000000-0000-0000-0000-000000000000",
        {
          error_code: "ERROR",
          error_message: "Error",
        },
      );

    expect(updated).toBeUndefined();
  });

it("marks a pending delivery as sending with processing timestamp", async () => {
  const { delivery } = await createDelivery();

  const result =
    await notificationDeliveryRepository.markSending(
      delivery.id,
    );

  expect(result).toBeDefined();
  expect(result?.status).toBe("sending");
  expect(result?.processing_started_at).not.toBeNull();
});

it("clears processing timestamp when delivery is sent", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  const result =
    await notificationDeliveryRepository.markSent(
      delivery.id,
      {
        provider_message_id: "wamid.test",
      },
    );

  expect(result?.status).toBe("sent");
  expect(result?.processing_started_at).toBeNull();
});

it("clears processing timestamp when delivery fails", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  const result =
    await notificationDeliveryRepository.markFailed(
      delivery.id,
      {
        error_code: "TEST_ERROR",
        error_message: "Test failure",
      },
    );

  expect(result?.status).toBe("failed");
  expect(result?.processing_started_at).toBeNull();
});

it("requeues stale sending deliveries", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  await db("notification_deliveries")
    .where({ id: delivery.id })
    .update({
      processing_started_at: db.raw(
        "now() - interval '10 minutes'",
      ),
    });

  const count =
    await notificationDeliveryRepository.requeueStaleSending(
      300,
    );

  expect(count).toBe(1);

  const result =
    await notificationDeliveryRepository.findById(
      delivery.id,
    );

  expect(result?.status).toBe("pending");
  expect(result?.processing_started_at).toBeNull();
});

it("should claim a pending delivery", async () => {
  const { delivery } = await createDelivery();

  const claimed =
    await notificationDeliveryRepository.claimPending();

  expect(claimed).toBeDefined();
  expect(claimed?.id).toBe(delivery.id);
  expect(claimed?.status).toBe("sending");
  expect(claimed?.attempts).toBe(1);
  expect(claimed?.processing_started_at).not.toBeNull();
});

it("should return undefined when no pending delivery exists", async () => {
  const result =
    await notificationDeliveryRepository.claimPending();

  expect(result).toBeUndefined();
});

it("should not claim a delivery that is already sending", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  const result =
    await notificationDeliveryRepository.claimPending();

  expect(result).toBeUndefined();
});

it("should claim the oldest pending delivery first", async () => {
  const first = await createDelivery();
  const second = await createDelivery();

  const claimed =
    await notificationDeliveryRepository.claimPending();

  expect(claimed).toBeDefined();
  expect(claimed?.id).toBe(first.delivery.id);
  expect(claimed?.id).not.toBe(second.delivery.id);
});

it("should claim the next pending delivery after the first one", async () => {
  const first = await createDelivery();
  const second = await createDelivery();

  const firstClaim =
    await notificationDeliveryRepository.claimPending();

  const secondClaim =
    await notificationDeliveryRepository.claimPending();

  expect(firstClaim?.id).toBe(first.delivery.id);
  expect(secondClaim?.id).toBe(second.delivery.id);

  expect(firstClaim?.status).toBe("sending");
  expect(secondClaim?.status).toBe("sending");
});

it("should claim different deliveries concurrently", async () => {
  const first = await createDelivery();
  const second = await createDelivery();

  const [firstClaim, secondClaim] =
    await Promise.all([
      notificationDeliveryRepository.claimPending(),
      notificationDeliveryRepository.claimPending(),
    ]);

  expect(firstClaim).toBeDefined();
  expect(secondClaim).toBeDefined();

  expect(firstClaim?.id).not.toBe(secondClaim?.id);

  expect([
    first.delivery.id,
    second.delivery.id,
  ]).toContain(firstClaim?.id);

  expect([
    first.delivery.id,
    second.delivery.id,
  ]).toContain(secondClaim?.id);

  expect(firstClaim?.status).toBe("sending");
  expect(secondClaim?.status).toBe("sending");
});

it("should schedule a retry", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  const result =
    await notificationDeliveryRepository.scheduleRetry(
      delivery.id,
      30,
      {
        error_code: "TEMPORARY_ERROR",
        error_message: "Temporary failure",
      },
    );

  expect(result).toBeDefined();
  expect(result?.status).toBe("pending");
  expect(result?.processing_started_at).toBeNull();
  expect(result?.next_attempt_at).not.toBeNull();
  expect(result?.error_code).toBe("TEMPORARY_ERROR");
  expect(result?.error_message).toBe(
    "Temporary failure",
  );
});

it("should not claim a delivery before its retry time", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  await notificationDeliveryRepository.scheduleRetry(
    delivery.id,
    300,
  );

  const result =
    await notificationDeliveryRepository.claimPending();

  expect(result).toBeUndefined();
});

it("should claim a delivery when its retry time has arrived", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  await db("notification_deliveries")
    .where({ id: delivery.id })
    .update({
      status: "pending",
      processing_started_at: null,
      next_attempt_at: db.raw(
        "now() - interval '1 minute'",
      ),
    });

  const result =
    await notificationDeliveryRepository.claimPending();

  expect(result).toBeDefined();
  expect(result?.id).toBe(delivery.id);
  expect(result?.status).toBe("sending");
});

it("should not schedule a retry after the maximum attempts", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  await notificationDeliveryRepository.scheduleRetry(
    delivery.id,
    0,
  );

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  await notificationDeliveryRepository.scheduleRetry(
    delivery.id,
    0,
  );

  await notificationDeliveryRepository.markSending(
    delivery.id,
  );

  const result =
    await notificationDeliveryRepository.scheduleRetry(
      delivery.id,
      30,
    );

  expect(result).toBeUndefined();

  const current =
    await notificationDeliveryRepository.findById(
      delivery.id,
    );

  expect(current?.status).toBe("sending");
  expect(current?.attempts).toBe(3);
});

it("should requeue stale sending delivery when attempts are below maximum", async () => {
  const { delivery } = await createDelivery();

  await notificationDeliveryRepository.claimPending();

  await db("notification_deliveries")
    .where({ id: delivery.id })
    .update({
      processing_started_at: db.raw(
        `now() - interval '60 seconds'`,
      ),
    });

  const count =
    await notificationDeliveryRepository.requeueStaleSending(30);

  expect(count).toBe(1);

  const updated =
    await notificationDeliveryRepository.findById(delivery.id);

  expect(updated?.status).toBe("pending");
  expect(updated?.processing_started_at).toBeNull();
});

it("should fail stale sending delivery when maximum attempts are reached", async () => {
  const { delivery } = await createDelivery();

  await db("notification_deliveries")
    .where({ id: delivery.id })
    .update({
      status: "sending",
      attempts: MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
      processing_started_at: db.raw(
        `now() - interval '60 seconds'`,
      ),
    });

  const count =
    await notificationDeliveryRepository.failExhaustedStaleSending(30);

  expect(count).toBe(1);

  const updated =
    await notificationDeliveryRepository.findById(delivery.id);

  expect(updated?.status).toBe("failed");
  expect(updated?.processing_started_at).toBeNull();
  expect(updated?.next_attempt_at).toBeNull();
  expect(updated?.error_code).toBe("MAX_ATTEMPTS_EXCEEDED");
});

});
