
import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type { NotificationService } from "../services/notification.service.js";

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async getAll(
    req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const notifications =
      await this.notificationService.getByUserId(
        req.session.user_id!,
      );

    sendSuccess(res, 200, notifications);
  }

  async getUnreadCount(
    req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const count =
      await this.notificationService.countUnreadByUserId(
        req.session.user_id!,
      );

    sendSuccess(res, 200, { count });
  }

  async markAsRead(
    req: HttpRequest<{ id: string }>,
    res: Response,
  ): Promise<void> {
    const notification =
      await this.notificationService.markAsRead(
        req.params.id,
        req.session.user_id!,
      );

    sendSuccess(res, 200, notification);
  }

  async markAllAsRead(
    req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const updatedCount =
      await this.notificationService.markAllAsRead(
        req.session.user_id!,
      );

    sendSuccess(res, 200, { updatedCount });
  }
}
