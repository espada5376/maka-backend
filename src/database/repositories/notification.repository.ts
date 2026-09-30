import { Knex } from "knex";

import db from "../knex.js";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

export interface CreateNotificationData {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class NotificationRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Notification | undefined> {
    return this.database<Notification>("notifications").where({ id }).first();
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return this.database<Notification>("notifications")
      .where({ user_id: userId })
      .orderBy("created_at", "desc");
  }

  async findUnreadByUserId(userId: string): Promise<Notification[]> {
    return this.database<Notification>("notifications")
      .where({
        user_id: userId,
      })
      .whereNull("read_at")
      .orderBy("created_at", "desc");
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    const result = await this.database("notifications")
      .where({
        user_id: userId,
      })
      .whereNull("read_at")
      .count<{ count: string }>("id as count")
      .first();

    return Number(result?.count ?? 0);
  }

  async create(
  data: CreateNotificationData,
  database: Knex = this.database,
): Promise<Notification> {
  const [notification] =
    await database<Notification>("notifications")
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data ?? {},
      })
      .returning("*");

  return notification;
}

  async markAsRead(id: string): Promise<Notification | undefined> {
    const [notification] = await this.database<Notification>("notifications")
      .where({ id })
      .whereNull("read_at")
      .update({
        read_at: this.database.fn.now(),
      })
      .returning("*");

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    return this.database<Notification>("notifications")
      .where({
        user_id: userId,
      })
      .whereNull("read_at")
      .update({
        read_at: this.database.fn.now(),
      });
  }

  async delete(id: string): Promise<number> {
    return this.database<Notification>("notifications").where({ id }).del();
  }
}
