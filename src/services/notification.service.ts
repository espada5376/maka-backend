import type { Knex } from "knex";

import db from "../database/knex.js";

import {
  NotificationRepository,
  type Notification,
  type CreateNotificationData,
} from "../database/repositories/notification.repository.js";

import {
  NotificationDeliveryRepository,
} from "../database/repositories/notification-delivery.repository.js";

import {
  getNotificationChannels,
} from "../notifications/types/notification-channel.js";

import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";


export class NotificationService {
  constructor(
  private readonly notificationRepository: NotificationRepository =
    new NotificationRepository(),
  private readonly notificationDeliveryRepository: NotificationDeliveryRepository =
    new NotificationDeliveryRepository(),
  private readonly database: Knex = db,
) {}

  async getById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);

    if (!notification) {
      throw createAppError(Errors.NOTIFICATION_NOT_FOUND);
    }

    return notification;
  }

  async getByUserId(userId: string): Promise<Notification[]> {
    const normalizedUserId = this.normalizeUserId(userId);

    return this.notificationRepository.findByUserId(normalizedUserId);
  }

  async getUnreadByUserId(userId: string): Promise<Notification[]> {
    const normalizedUserId = this.normalizeUserId(userId);

    return this.notificationRepository.findUnreadByUserId(normalizedUserId);
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const normalizedUserId = this.normalizeUserId(userId);

    return this.notificationRepository.countUnreadByUserId(normalizedUserId);
  }

 async create(
  data: CreateNotificationData,
  database: Knex = this.database,
): Promise<Notification> {
  const userId = this.normalizeUserId(data.user_id);
  const type = this.normalizeType(data.type);
  const title = this.normalizeTitle(data.title);
  const body = this.normalizeBody(data.body);
  const notificationData = this.validateData(data.data);

  const channels = getNotificationChannels(type);

  const createNotification = async (transaction: Knex) => {
    const notification =
      await this.notificationRepository.create(
        {
          user_id: userId,
          type,
          title,
          body,
          data: notificationData,
        },
        transaction,
      );

    if (channels.includes("whatsapp")) {
      await this.notificationDeliveryRepository.create(
        {
          notification_id: notification.id,
          channel: "whatsapp",
        },
        transaction,
      );
    }

    return notification;
  };

  if (database === this.database) {
    return this.database.transaction(createNotification);
  }

  return createNotification(database);
}

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(id);

    if (notification) {
      return notification;
    }

    // markAsRead retourne undefined si la notification
    // n'existe pas OU si elle est déjà lue.
    const existingNotification = await this.notificationRepository.findById(id);

    if (!existingNotification) {
      throw createAppError(Errors.NOTIFICATION_NOT_FOUND);
    }

    // La notification est déjà lue : opération idempotente.
    return existingNotification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const normalizedUserId = this.normalizeUserId(userId);

    return this.notificationRepository.markAllAsRead(normalizedUserId);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    const deletedCount = await this.notificationRepository.delete(id);

    if (deletedCount === 0) {
      throw createAppError(Errors.NOTIFICATION_NOT_FOUND);
    }
  }

  private normalizeUserId(userId: string): string {
    if (typeof userId !== "string") {
      throw createAppError(Errors.INVALID_USER_ID);
    }

    const normalizedUserId = userId.trim();

    if (!normalizedUserId) {
      throw createAppError(Errors.INVALID_USER_ID);
    }

    return normalizedUserId;
  }

  private normalizeType(type: string): string {
    if (typeof type !== "string") {
      throw createAppError(Errors.INVALID_TYPE);
    }

    const normalizedType = type.trim();

    if (!normalizedType) {
      throw createAppError(Errors.INVALID_TYPE);
    }

    if (normalizedType.length > 50) {
      throw createAppError(Errors.INVALID_TYPE);
    }

    return normalizedType;
  }

  private normalizeTitle(title: string): string {
    if (typeof title !== "string") {
      throw createAppError(Errors.INVALID_TYPE);
    }

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      throw createAppError(Errors.INVALID_TITLE);
    }

    if (normalizedTitle.length > 150) {
      throw createAppError(Errors.INVALID_TITLE);
    }

    return normalizedTitle;
  }

  private normalizeBody(body: string): string {
    if (typeof body !== "string") {
      throw createAppError(Errors.INVALID_BODY);
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      throw createAppError(Errors.INVALID_BODY);
    }

    return normalizedBody;
  }

  private validateData(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (data === undefined) {
      return {};
    }

    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw createAppError(Errors.INVALID_DATA);
    }

    return data;
  }
}
