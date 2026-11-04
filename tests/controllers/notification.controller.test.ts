import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationController } from "../../src/controllers/notification.controller.js";

describe("NotificationController", () => {
  const notificationService = {
    getByUserId: vi.fn(),
    countUnreadByUserId: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  };

  const controller = new NotificationController(
    notificationService as any,
  );

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

describe("getAll", () => {
  it("should return notifications belonging to the authenticated user", async () => {
    const notifications = [
      {
        id: "notification-1",
        user_id: "user-123",
        type: "new_order",
        title: "Nouvelle commande",
      },
    ];

    notificationService.getByUserId.mockResolvedValue(notifications);

    const req = {
      session: {
        id: "session-123",
        user_id: "user-123",
      },
    };

    await controller.getAll(req as any, res as any);

    expect(notificationService.getByUserId).toHaveBeenCalledWith("user-123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: notifications,
    });
  });
});

describe("getUnreadCount", () => {
  it("should return the unread notification count for the authenticated user", async () => {
    notificationService.countUnreadByUserId.mockResolvedValue(5);

    const req = {
      session: {
        id: "session-123",
        user_id: "user-123",
      },
    };

    await controller.getUnreadCount(req as any, res as any);

    expect(
      notificationService.countUnreadByUserId,
    ).toHaveBeenCalledWith("user-123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { count: 5 },
    });
  });
});


describe("markAsRead", () => {
  it("should mark a notification as read for the authenticated user", async () => {
    const notification = {
      id: "notification-123",
      user_id: "user-123",
      title: "Nouvelle commande",
      read_at: new Date(),
    };

    notificationService.markAsRead.mockResolvedValue(notification);

    const req = {
      params: {
        id: "notification-123",
      },
      session: {
        id: "session-123",
        user_id: "user-123",
      },
    };

    await controller.markAsRead(req as any, res as any);

    expect(notificationService.markAsRead).toHaveBeenCalledWith(
      "notification-123",
      "user-123",
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: notification,
    });
  });
});

describe("markAllAsRead", () => {
  it("should mark all notifications as read for the authenticated user", async () => {
    notificationService.markAllAsRead.mockResolvedValue(3);

    const req = {
      session: {
        id: "session-123",
        user_id: "user-123",
      },
    };

    await controller.markAllAsRead(req as any, res as any);

    expect(
      notificationService.markAllAsRead,
    ).toHaveBeenCalledWith("user-123");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { updatedCount: 3 },
    });
  });
});


});
