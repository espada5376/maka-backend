import { describe, expect, it, vi } from "vitest";

import { NotificationService } from "../../src/services/notification.service.js";

import type {
  Notification,
  NotificationRepository,
} from "../../src/database/repositories/notification.repository.js";

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

describe("NotificationService", () => {
  describe("getById", () => {
    it("returns the notification when it exists", async () => {
      const repository = createRepositoryMock();
      const notification = createNotification();

      vi.mocked(repository.findById).mockResolvedValue(notification);

      const service = new NotificationService(repository);

      await expect(service.getById("notification-1")).resolves.toEqual(
        notification,
      );

      expect(repository.findById).toHaveBeenCalledWith("notification-1");
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new NotificationService(repository);

      await expect(service.getById("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });
    });
  });

  describe("getByUserId", () => {
    it("returns all notifications of a user", async () => {
      const repository = createRepositoryMock();

      const notifications = [
        createNotification(),
        createNotification({
          id: "notification-2",
        }),
      ];

      vi.mocked(repository.findByUserId).mockResolvedValue(notifications);

      const service = new NotificationService(repository);

      await expect(service.getByUserId("user-1")).resolves.toEqual(
        notifications,
      );

      expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("trims the user id before calling the repository", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findByUserId).mockResolvedValue([]);

      const service = new NotificationService(repository);

      await service.getByUserId("  user-1  ");

      expect(repository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

      await expect(service.getByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.findByUserId).not.toHaveBeenCalled();
    });
  });

  describe("getUnreadByUserId", () => {
    it("returns unread notifications of a user", async () => {
      const repository = createRepositoryMock();

      const notifications = [
        createNotification(),
        createNotification({
          id: "notification-2",
        }),
      ];

      vi.mocked(repository.findUnreadByUserId).mockResolvedValue(notifications);

      const service = new NotificationService(repository);

      await expect(service.getUnreadByUserId("user-1")).resolves.toEqual(
        notifications,
      );

      expect(repository.findUnreadByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

      await expect(service.getUnreadByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.findUnreadByUserId).not.toHaveBeenCalled();
    });
  });

  describe("countUnreadByUserId", () => {
    it("returns the unread notification count", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.countUnreadByUserId).mockResolvedValue(3);

      const service = new NotificationService(repository);

      await expect(service.countUnreadByUserId("user-1")).resolves.toBe(3);

      expect(repository.countUnreadByUserId).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

      await expect(service.countUnreadByUserId("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.countUnreadByUserId).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("creates a notification with normalized data", async () => {
      const repository = createRepositoryMock();

      const notification = createNotification();

      vi.mocked(repository.create).mockResolvedValue(notification);

      const service = new NotificationService(repository);

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

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data: {
          order_id: "order-1",
        },
      });
    });

    it("uses an empty object when data is omitted", async () => {
      const repository = createRepositoryMock();

      const notification = createNotification({
        data: {},
      });

      vi.mocked(repository.create).mockResolvedValue(notification);

      const service = new NotificationService(repository);

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data: {},
      });
    });

    it("throws INVALID_USER_ID when user id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          type: "a".repeat(50),
        }),
      );

      const service = new NotificationService(repository);

      await service.create({
        user_id: "user-1",
        type: "a".repeat(50),
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "a".repeat(50),
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data: {},
      });
    });

    it("throws INVALID_TITLE when title is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("throws INVALID_TITLE when title exceeds 150 characters", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("accepts a title of exactly 150 characters", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          title: "a".repeat(150),
        }),
      );

      const service = new NotificationService(repository);

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "a".repeat(150),
        body: "Une nouvelle commande a été créée.",
      });

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "order.created",
        title: "a".repeat(150),
        body: "Une nouvelle commande a été créée.",
        data: {},
      });
    });

    it("throws INVALID_BODY when body is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("accepts a non-empty body without a maximum length restriction", async () => {
      const repository = createRepositoryMock();

      const body = "a".repeat(10000);

      vi.mocked(repository.create).mockResolvedValue(
        createNotification({
          body,
        }),
      );

      const service = new NotificationService(repository);

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body,
      });

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body,
        data: {},
      });
    });

    it("throws INVALID_DATA when data is null", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("throws INVALID_DATA when data is an array", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("throws INVALID_DATA when data is a primitive value", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

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
    });

    it("accepts an object as data", async () => {
      const repository = createRepositoryMock();

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

      const service = new NotificationService(repository);

      await service.create({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data,
      });

      expect(repository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        type: "order.created",
        title: "Nouvelle commande",
        body: "Une nouvelle commande a été créée.",
        data,
      });
    });
  });

  describe("markAsRead", () => {
    it("marks an unread notification as read", async () => {
      const repository = createRepositoryMock();

      const notification = createNotification({
        read_at: new Date("2026-01-01T11:00:00.000Z"),
      });

      vi.mocked(repository.markAsRead).mockResolvedValue(notification);

      const service = new NotificationService(repository);

      await expect(service.markAsRead("notification-1")).resolves.toEqual(
        notification,
      );

      expect(repository.markAsRead).toHaveBeenCalledWith("notification-1");
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.markAsRead).mockResolvedValue(undefined);
      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new NotificationService(repository);

      await expect(service.markAsRead("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });

      expect(repository.markAsRead).toHaveBeenCalledWith("notification-1");
      expect(repository.findById).toHaveBeenCalledWith("notification-1");
    });

    it("returns the existing notification when it is already read", async () => {
      const repository = createRepositoryMock();

      const notification = createNotification({
        read_at: new Date("2026-01-01T11:00:00.000Z"),
      });

      vi.mocked(repository.markAsRead).mockResolvedValue(undefined);
      vi.mocked(repository.findById).mockResolvedValue(notification);

      const service = new NotificationService(repository);

      await expect(service.markAsRead("notification-1")).resolves.toEqual(
        notification,
      );

      expect(repository.markAsRead).toHaveBeenCalledWith("notification-1");
      expect(repository.findById).toHaveBeenCalledWith("notification-1");
    });
  });

  describe("markAllAsRead", () => {
    it("marks all unread notifications as read", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.markAllAsRead).mockResolvedValue(4);

      const service = new NotificationService(repository);

      await expect(service.markAllAsRead("user-1")).resolves.toBe(4);

      expect(repository.markAllAsRead).toHaveBeenCalledWith("user-1");
    });

    it("trims the user id before calling the repository", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.markAllAsRead).mockResolvedValue(2);

      const service = new NotificationService(repository);

      await service.markAllAsRead("  user-1  ");

      expect(repository.markAllAsRead).toHaveBeenCalledWith("user-1");
    });

    it("throws INVALID_USER_ID when the user id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new NotificationService(repository);

      await expect(service.markAllAsRead("   ")).rejects.toMatchObject({
        code: "INVALID_USER_ID",
      });

      expect(repository.markAllAsRead).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes an existing notification", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createNotification());

      vi.mocked(repository.delete).mockResolvedValue(1);

      const service = new NotificationService(repository);

      await expect(service.delete("notification-1")).resolves.toBeUndefined();

      expect(repository.findById).toHaveBeenCalledWith("notification-1");
      expect(repository.delete).toHaveBeenCalledWith("notification-1");
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new NotificationService(repository);

      await expect(service.delete("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("throws NOTIFICATION_NOT_FOUND when the notification disappears before deletion", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createNotification());

      vi.mocked(repository.delete).mockResolvedValue(0);

      const service = new NotificationService(repository);

      await expect(service.delete("notification-1")).rejects.toMatchObject({
        code: "NOTIFICATION_NOT_FOUND",
      });

      expect(repository.delete).toHaveBeenCalledWith("notification-1");
    });
  });
});
