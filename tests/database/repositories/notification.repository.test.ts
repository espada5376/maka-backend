import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  NotificationRepository,
} from "../../../src/database/repositories/notification.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import { cleanDatabase } from "../../helpers/database";

describe("NotificationRepository", () => {
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
    name = "Notification User",
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
    overrides: Record<string, unknown> = {},
  ) {
    return notificationRepository.create({
      user_id: userId,
      type: "order_update",
      title: "Commande mise à jour",
      body: "Votre commande a été mise à jour.",
      ...overrides,
    });
  }

  it("should create a notification", async () => {
    const user = await createUser();

    const notification =
      await notificationRepository.create({
        user_id: user.id,
        type: "order_update",
        title: "Commande mise à jour",
        body: "Votre commande a été mise à jour.",
      });

    expect(notification).toBeDefined();
    expect(notification.id).toBeDefined();
    expect(notification.user_id).toBe(user.id);
    expect(notification.type).toBe(
      "order_update",
    );
    expect(notification.title).toBe(
      "Commande mise à jour",
    );
    expect(notification.body).toBe(
      "Votre commande a été mise à jour.",
    );
    expect(notification.data).toEqual({});
    expect(notification.read_at).toBeNull();
    expect(notification.created_at).toBeDefined();
  });

  it("should preserve notification data", async () => {
    const user = await createUser();

    const data = {
      order_id: "order-123",
      reference: "ORD-123",
      amount: 45000,
    };

    const notification =
      await createNotification(user.id, {
        data,
      });

    expect(notification.data).toEqual(data);
  });

  it("should allow custom notification data to be empty", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id, {
        data: {},
      });

    expect(notification.data).toEqual({});
  });

  it("should reject a notification for a nonexistent user", async () => {
    await expect(
      notificationRepository.create({
        user_id:
          "00000000-0000-0000-0000-000000000000",
        type: "order_update",
        title: "Notification",
        body: "Message",
      }),
    ).rejects.toThrow();
  });

  it("should find a notification by id", async () => {
    const user = await createUser();

    const created =
      await createNotification(user.id);

    const notification =
      await notificationRepository.findById(
        created.id,
      );

    expect(notification).toBeDefined();
    expect(notification?.id).toBe(created.id);
  });

  it("should return undefined for an unknown id", async () => {
    const notification =
      await notificationRepository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(notification).toBeUndefined();
  });

  it("should find notifications by user id", async () => {
    const user = await createUser();

    await createNotification(user.id, {
      title: "Notification 1",
    });

    await createNotification(user.id, {
      title: "Notification 2",
    });

    const notifications =
      await notificationRepository.findByUserId(
        user.id,
      );

    expect(notifications).toHaveLength(2);
  });

  it("should not return notifications from another user", async () => {
    const user1 = await createUser("User 1");
    const user2 = await createUser("User 2");

    await createNotification(user1.id);

    await createNotification(user2.id);

    const notifications =
      await notificationRepository.findByUserId(
        user1.id,
      );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].user_id).toBe(
      user1.id,
    );
  });

  it("should return user notifications ordered by newest first", async () => {
    const user = await createUser();

    const older = await createNotification(
      user.id,
      {
        created_at: new Date(
          "2026-01-01T10:00:00Z",
        ),
      },
    );

    const newer = await createNotification(
      user.id,
      {
        created_at: new Date(
          "2026-01-02T10:00:00Z",
        ),
      },
    );

    const notifications =
      await notificationRepository.findByUserId(
        user.id,
      );

    expect(notifications[0].id).toBe(
      newer.id,
    );

    expect(notifications[1].id).toBe(
      older.id,
    );
  });

  it("should find only unread notifications", async () => {
    const user = await createUser();

    await createNotification(user.id);

    const read =
      await createNotification(user.id);

    await notificationRepository.markAsRead(
      read.id,
    );

    const unread =
      await notificationRepository.findUnreadByUserId(
        user.id,
      );

    expect(unread).toHaveLength(1);
    expect(unread[0].id).not.toBe(read.id);
    expect(unread[0].read_at).toBeNull();
  });

  it("should return an empty array when the user has no unread notifications", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    await notificationRepository.markAsRead(
      notification.id,
    );

    const unread =
      await notificationRepository.findUnreadByUserId(
        user.id,
      );

    expect(unread).toHaveLength(0);
  });

  it("should count unread notifications", async () => {
    const user = await createUser();

    await createNotification(user.id);
    await createNotification(user.id);
    const read =
      await createNotification(user.id);

    await notificationRepository.markAsRead(
      read.id,
    );

    const count =
      await notificationRepository.countUnreadByUserId(
        user.id,
      );

    expect(count).toBe(2);
  });

  it("should return zero unread notifications for a user without notifications", async () => {
    const user = await createUser();

    const count =
      await notificationRepository.countUnreadByUserId(
        user.id,
      );

    expect(count).toBe(0);
  });

  it("should create notifications as unread", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    expect(notification.read_at).toBeNull();
  });

  it("should mark a notification as read", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const updated =
      await notificationRepository.markAsRead(
        notification.id,
      );

    expect(updated).toBeDefined();
    expect(updated?.read_at).not.toBeNull();
  });

  it("should not return a notification after marking it as read", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    await notificationRepository.markAsRead(
      notification.id,
    );

    const unread =
      await notificationRepository.findUnreadByUserId(
        user.id,
      );

    expect(unread).toHaveLength(0);
  });

  it("should keep a notification read when markAsRead is called twice", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const first =
      await notificationRepository.markAsRead(
        notification.id,
      );

    const firstReadAt =
      first?.read_at;

    const second =
      await notificationRepository.markAsRead(
        notification.id,
      );

    expect(second?.read_at).not.toBeNull();
    expect(firstReadAt).not.toBeNull();
  });

  it("should return undefined when marking an unknown notification as read", async () => {
    const updated =
      await notificationRepository.markAsRead(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(updated).toBeUndefined();
  });

  it("should mark all user notifications as read", async () => {
    const user = await createUser();

    await createNotification(user.id);
    await createNotification(user.id);
    await createNotification(user.id);

    const updated =
      await notificationRepository.markAllAsRead(
        user.id,
      );

    expect(updated).toBe(3);

    const unread =
      await notificationRepository.findUnreadByUserId(
        user.id,
      );

    expect(unread).toHaveLength(0);
  });

  it("should only mark unread notifications as read", async () => {
    const user = await createUser();

    const unread =
      await createNotification(user.id);

    const read =
      await createNotification(user.id);

    await notificationRepository.markAsRead(
      read.id,
    );

    await notificationRepository.markAllAsRead(
      user.id,
    );

    const readAgain =
      await notificationRepository.findById(
        read.id,
      );

    const unreadNow =
      await notificationRepository.findById(
        unread.id,
      );

    expect(readAgain?.read_at).not.toBeNull();
    expect(unreadNow?.read_at).not.toBeNull();
  });

  it("should not mark another user's notifications as read", async () => {
    const user1 = await createUser("User 1");
    const user2 = await createUser("User 2");

    await createNotification(user1.id);
    const user2Notification =
      await createNotification(user2.id);

    await notificationRepository.markAllAsRead(
      user1.id,
    );

    const notification =
      await notificationRepository.findById(
        user2Notification.id,
      );

    expect(notification?.read_at).toBeNull();
  });

  it("should return zero when marking all notifications as read for a user without notifications", async () => {
    const user = await createUser();

    const updated =
      await notificationRepository.markAllAsRead(
        user.id,
      );

    expect(updated).toBe(0);
  });

  it("should delete a notification", async () => {
    const user = await createUser();

    const notification =
      await createNotification(user.id);

    const deleted =
      await notificationRepository.delete(
        notification.id,
      );

    expect(deleted).toBe(1);

    const found =
      await notificationRepository.findById(
        notification.id,
      );

    expect(found).toBeUndefined();
  });

  it("should return zero when deleting an unknown notification", async () => {
    const deleted =
      await notificationRepository.delete(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(deleted).toBe(0);
  });

  it("should reject deleting a user before deleting their notifications", async () => {
    const user = await createUser();

    await createNotification(user.id);

    await expect(
  db("users")
    .where({ id: user.id })
    .del(),
).rejects.toThrow();
  });
});
