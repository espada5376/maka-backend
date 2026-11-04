import { describe, expect, it, vi } from "vitest";
import type { Knex } from "knex";

import { NotificationService } from "../../src/services/notification.service.js";

import type {
  Notification,
  NotificationRepository,
} from "../../src/database/repositories/notification.repository.js";

import type {
  NotificationDeliveryRepository,
} from "../../src/database/repositories/notification-delivery.repository.js";

const createNotification = (
  overrides: Partial<Notification> = {},
): Notification => ({
  id: "notification-1",
  user_id: "user-1",
  type: "order.created",
  title: "Nouvelle commande",
  body: "Une nouvelle commande a été créée.",
  data: {
    order_id: "order-1",
  },
  read_at: null,
  created_at: new Date("2026-01-01T10:00:00.000Z"),
  ...overrides,
});

const createRepositoryMock = () =>
  ({
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findUnreadByUserId: vi.fn(),
    countUnreadByUserId: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn(),
  }) as unknown as NotificationRepository;

const createDeliveryRepositoryMock = () =>
  ({
    findById: vi.fn(),
    findByNotificationId: vi.fn(),
    create: vi.fn(),
    markSending: vi.fn(),
    markSent: vi.fn(),
    markDelivered: vi.fn(),
    markRead: vi.fn(),
    markFailed: vi.fn(),
    requeueStaleSending: vi.fn(),
    failExhaustedStaleSending: vi.fn(),
    claimPending: vi.fn(),
    scheduleRetry: vi.fn(),
  }) as unknown as NotificationDeliveryRepository;

const createDatabaseMock = () => {
  const transaction = {} as Knex;

  const database = {
    transaction: vi.fn(async <T>(
      callback: (transaction: Knex) => Promise<T>,
    ): Promise<T> => callback(transaction)),
  } as unknown as Knex;

  return {
    database,
    transaction,
  };
};

const createService = () => {
  const repository = createRepositoryMock();
  const deliveryRepository = createDeliveryRepositoryMock();
  const { database, transaction } = createDatabaseMock();

  const service = new NotificationService(
  repository,
  deliveryRepository,
  database,
);

  return {
    service,
    repository,
    deliveryRepository,
    database,
    transaction,
  };
};

describe("NotificationService", () => {
  describe("getById", () => {
    it("returns the notification when it exists", async () => {
      const {
        service,
        repository,
      } = createService();

      const notification = createNotification();

      vi.mocked(repository.findById).mockResolvedValue(notification);

      await expect(service.getById("notification-1")).resolves.toEqual(
        notification,
      );

      expect(repository.findById).toHaveBeenCalledWith("notification-1");
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      await expect(service.getById("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });
    });
  });

  describe("getByUserId", () => {
    it("returns all notifications of a user", async () => {
      const {
        service,
        repository,
      } = createService();

      const notifications = [
        createNotification(),
        createNotification({
          id: "notification-2",
        }),
      ];

      vi.mocked(repository.findByUserId).mockResolvedValue(notifications);

      await expect(service.getByUserId("user-1")).resolves.toEqual(
        notifications,
      );

      expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("trims the user id before calling the repository", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.findByUserId).mockResolvedValue([]);

      await service.getByUserId("  user-1  ");

      expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(service.getByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe("getUnreadByUserId", () => {
    it("returns unread notifications of a user", async () => {
      const {
        service,
        repository,
      } = createService();

      const notifications = [
        createNotification(),
        createNotification({
          id: "notification-2",
        }),
      ];

      vi.mocked(repository.findUnreadByUserId).mockResolvedValue(notifications);

      await expect(service.getUnreadByUserId("user-1")).resolves.toEqual(
        notifications,
      );

      expect(repository.findUnreadByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(service.getUnreadByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.findUnreadByUserId).not.toHaveBeenCalled();
    });
  });

  describe("countUnreadByUserId", () => {
    it("returns the unread notification count", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.countUnreadByUserId).mockResolvedValue(3);

      await expect(service.countUnreadByUserId("user-1")).resolves.toBe(3);

      expect(repository.countUnreadByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(service.countUnreadByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.countUnreadByUserId).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("creates a notification with normalized data", async () => {
      const {
        service,
        repository,
        deliveryRepository,
        database,
        transaction,
      } = createService();

      const notification = createNotification();

      vi.mocked(repository.create).mockResolvedValue(notification);

      await expect(
        service.create({
          user_id: " user-1 ",
          type: " order.created ",
          title: " Nouvelle commande ",
          body: " Une nouvelle commande a été créée. ",
          data: {
            order_id: "order-1",
          },
        }),
      ).resolves.toEqual(notification);

      expect(database.transaction).toHaveBeenCalledTimes(1);

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: {
            order_id: "order-1",
          },
        },
        transaction,
      );

      expect(deliveryRepository.create).not.toHaveBeenCalled();
    });

    it("uses an empty object when data is omitted", async () => {
      const {
        service,
        repository,
        transaction,
      } = createService();

      const notification = createNotification({
        data: {},
      });

      vi.mocked(repository.create).mockResolvedValue(notification);

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: {},
        },
        transaction,
      );
    });

    it("throws INVALID_USER_ID when user id is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "   ",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_TYPE when type is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "   ",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TYPE",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_TYPE when type exceeds 50 characters", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "a".repeat(51),
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TYPE",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("accepts a type of exactly 50 characters", async () => {
      const {
        service,
        repository,
        transaction,
      } = createService();

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          type: "a".repeat(50),
        }),
      );

      await service.create({
        user_id: "user-1",
        type: "a".repeat(50),
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "a".repeat(50),
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: {},
        },
        transaction,
      );
    });

    it("throws INVALID_TITLE when title is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "   ",
          body: "Une nouvelle commande a été créée.",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TITLE",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_TITLE when title exceeds 150 characters", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "a".repeat(151),
          body: "Une nouvelle commande a été créée.",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TITLE",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("accepts a title of exactly 150 characters", async () => {
      const {
        service,
        repository,
        transaction,
      } = createService();

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          title: "a".repeat(150),
        }),
      );

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "a".repeat(150),
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "order.created",
          title: "a".repeat(150),
          body: "Une nouvelle commande a été créée.",
          data: {},
        },
        transaction,
      );
    });

    it("throws INVALID_BODY when body is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_BODY",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("accepts a non-empty body without a maximum length restriction", async () => {
      const {
        service,
        repository,
        transaction,
      } = createService();

      const body = "a".repeat(10000);

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          body,
        }),
      );

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body,
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body,
          data: {},
        },
        transaction,
      );
    });

    it("throws INVALID_DATA when data is null", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: null as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_DATA when data is an array", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: [] as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_DATA when data is a primitive value", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(
        service.create({
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data: "invalid" as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("accepts an object as data", async () => {
      const {
        service,
        repository,
        transaction,
      } = createService();

      const data = {
        order_id: "order-1",
        product_id: "product-1",
        quantity: 2,
      };

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          data,
        }),
      );

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data,
      });

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "user-1",
          type: "order.created",
          title: "Nouvelle commande",
          body: "Une nouvelle commande a été créée.",
          data,
        },
        transaction,
      );
    });

    it("creates a WhatsApp delivery for a seller new-order notification", async () => {
      const {
        service,
        repository,
        deliveryRepository,
        transaction,
      } = createService();

      const notification = createNotification({
        type: "new_order_for_seller",
      });

      vi.mocked(repository.create).mockResolvedValue(notification);

      await expect(
        service.create({
          user_id: "seller-1",
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: "Vous avez reçu une nouvelle commande.",
          data: {
            order_id: "order-1",
          },
        }),
      ).resolves.toEqual(notification);

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "seller-1",
          type: "new_order_for_seller",
          title: "Nouvelle commande",
          body: "Vous avez reçu une nouvelle commande.",
          data: {
            order_id: "order-1",
          },
        },
        transaction,
      );

      expect(deliveryRepository.create).toHaveBeenCalledWith(
        {
          notification_id: notification.id,
          channel: "whatsapp",
        },
        transaction,
      );
    });

    it("does not create a WhatsApp delivery for a buyer new-order notification", async () => {
      const {
        service,
        repository,
        deliveryRepository,
        transaction,
      } = createService();

      const notification = createNotification({
        user_id: "buyer-1",
        type: "new_order_for_buyer",
      });

      vi.mocked(repository.create).mockResolvedValue(notification);

      await expect(
        service.create({
          user_id: "buyer-1",
          type: "new_order_for_buyer",
          title: "Commande confirmée",
          body: "Votre commande a bien été enregistrée.",
          data: {
            order_id: "order-1",
          },
        }),
      ).resolves.toEqual(notification);

      expect(repository.create).toHaveBeenCalledWith(
        {
          user_id: "buyer-1",
          type: "new_order_for_buyer",
          title: "Commande confirmée",
          body: "Votre commande a bien été enregistrée.",
          data: {
            order_id: "order-1",
          },
        },
        transaction,
      );

      expect(deliveryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("markAsRead", () => {
  it("marks an unread notification as read", async () => {
    const { service, repository } = createService();

    const notification = createNotification({
      read_at: new Date("2026-01-01T11:00:00.000Z"),
    });

    vi.mocked(repository.markAsRead).mockResolvedValue(notification);

    await expect(
      service.markAsRead("notification-1", "user-1"),
    ).resolves.toEqual(notification);

    expect(repository.markAsRead).toHaveBeenCalledWith(
      "notification-1",
      "user-1",
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
    const { service, repository } = createService();

    vi.mocked(repository.markAsRead).mockResolvedValue(undefined);
    vi.mocked(repository.findById).mockResolvedValue(undefined);

    await expect(
      service.markAsRead("notification-1", "user-1"),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    });

    expect(repository.markAsRead).toHaveBeenCalledWith(
      "notification-1",
      "user-1",
    );
    expect(repository.findById).toHaveBeenCalledWith("notification-1");
  });

  it("returns the existing notification when it is already read and belongs to the user", async () => {
    const { service, repository } = createService();

    const notification = createNotification({
      read_at: new Date("2026-01-01T11:00:00.000Z"),
    });

    vi.mocked(repository.markAsRead).mockResolvedValue(undefined);
    vi.mocked(repository.findById).mockResolvedValue(notification);

    await expect(
      service.markAsRead("notification-1", "user-1"),
    ).resolves.toEqual(notification);

    expect(repository.markAsRead).toHaveBeenCalledWith(
      "notification-1",
      "user-1",
    );
    expect(repository.findById).toHaveBeenCalledWith("notification-1");
  });

  it("throws NOTIFICATION_NOT_FOUND when the notification belongs to another user", async () => {
    const { service, repository } = createService();

    const notification = createNotification({
      user_id: "user-2",
      read_at: new Date("2026-01-01T11:00:00.000Z"),
    });

    vi.mocked(repository.markAsRead).mockResolvedValue(undefined);
    vi.mocked(repository.findById).mockResolvedValue(notification);

    await expect(
      service.markAsRead("notification-1", "user-1"),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    });

    expect(repository.markAsRead).toHaveBeenCalledWith(
      "notification-1",
      "user-1",
    );
  });
});

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.markAllAsRead).mockResolvedValue(4);

      await expect(service.markAllAsRead("user-1")).resolves.toBe(4);

      expect(repository.markAllAsRead).toHaveBeenCalledWith("user-1");
    });

    it("trims the user id before calling the repository", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.markAllAsRead).mockResolvedValue(2);

      await service.markAllAsRead("  user-1  ");

      expect(repository.markAllAsRead).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const {
        service,
        repository,
      } = createService();

      await expect(service.markAllAsRead("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.markAllAsRead).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes an existing notification", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.findById).mockResolvedValue(createNotification());

      vi.mocked(repository.delete).mockResolvedValue(1);

      await expect(service.delete("notification-1")).resolves.toBeUndefined();

      expect(repository.findById).toHaveBeenCalledWith("notification-1");
      expect(repository.delete).toHaveBeenCalledWith("notification-1");
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      await expect(service.delete("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification disappears before deletion", async () => {
      const {
        service,
        repository,
      } = createService();

      vi.mocked(repository.findById).mockResolvedValue(createNotification());

      vi.mocked(repository.delete).mockResolvedValue(0);

      await expect(service.delete("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });

      expect(repository.delete).toHaveBeenCalledWith("notification-1");
    });
  });
});

