import { Knex } from "knex";

import db from "../knex.js";

export type NotificationDeliveryChannel = "whatsapp";

export type NotificationDeliveryStatus =
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  attempts: number;
  provider_message_id: string | null;
  sent_at: Date | null;
  delivered_at: Date | null;
  read_at: Date | null;
  failed_at: Date | null;
  processing_started_at: Date | null;
  next_attempt_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNotificationDeliveryData {
  notification_id: string;
  channel?: NotificationDeliveryChannel;
}

export interface MarkNotificationDeliverySentData {
  provider_message_id: string;
}

export interface MarkNotificationDeliveryFailedData {
  error_code?: string | null;
  error_message?: string | null;
}

export const MAX_NOTIFICATION_DELIVERY_ATTEMPTS = 3;

export class NotificationDeliveryRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(
    id: string,
  ): Promise<NotificationDelivery | undefined> {
    return this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({ id })
      .first();
  }

  async findByNotificationId(
    notificationId: string,
  ): Promise<NotificationDelivery | undefined> {
    return this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({
        notification_id: notificationId,
      })
      .first();
  }

  async create(
  data: CreateNotificationDeliveryData,
  database: Knex = this.database,
): Promise<NotificationDelivery> {
  const [delivery] =
    await database<NotificationDelivery>(
      "notification_deliveries",
    )
      .insert({
        notification_id: data.notification_id,
        channel: data.channel ?? "whatsapp",
        status: "pending",
        attempts: 0,
        next_attempt_at: null,
      })
      .returning("*");

  return delivery;
}

  async markSending(
  id: string,
): Promise<NotificationDelivery | undefined> {
  const [delivery] =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({
        id,
        status: "pending",
      })
      .update({
        status: "sending",
        attempts: this.database.raw("attempts + 1"),
        processing_started_at: this.database.fn.now(),
        updated_at: this.database.fn.now(),
      })
      .returning("*");

  return delivery;
}

 async markSent(
  id: string,
  data: MarkNotificationDeliverySentData,
): Promise<NotificationDelivery | undefined> {
  const [delivery] =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({ id })
      .update({
        status: "sent",
        provider_message_id: data.provider_message_id,
        sent_at: this.database.fn.now(),
        processing_started_at: null,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

  return delivery;
}

  async markDelivered(
    id: string,
  ): Promise<NotificationDelivery | undefined> {
    const [delivery] =
      await this.database<NotificationDelivery>(
        "notification_deliveries",
      )
        .where({ id })
        .update({
          status: "delivered",
          delivered_at: this.database.fn.now(),
          updated_at: this.database.fn.now(),
        })
        .returning("*");

    return delivery;
  }

  async markRead(
    id: string,
  ): Promise<NotificationDelivery | undefined> {
    const [delivery] =
      await this.database<NotificationDelivery>(
        "notification_deliveries",
      )
        .where({ id })
        .update({
          status: "read",
          read_at: this.database.fn.now(),
          updated_at: this.database.fn.now(),
        })
        .returning("*");

    return delivery;
  }

  async markFailed(
  id: string,
  data: MarkNotificationDeliveryFailedData = {},
): Promise<NotificationDelivery | undefined> {
  const [delivery] =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({
        id,
        status: "sending",
      })
      .update({
        status: "failed",
        failed_at: this.database.fn.now(),
        processing_started_at: null,
        next_attempt_at: null,
        error_code: data.error_code ?? null,
        error_message: data.error_message ?? null,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

  return delivery;
}

async requeueStaleSending(
  timeoutSeconds: number,
): Promise<number> {
  const result =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where("status", "sending")
      .where(
        "attempts",
        "<",
        MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
      )
      .where(
        "processing_started_at",
        "<",
        this.database.raw(
          `now() - (? * interval '1 second')`,
          [timeoutSeconds],
        ),
      )
      .update({
        status: "pending",
        processing_started_at: null,
        updated_at: this.database.fn.now(),
      });

  return result;
}

async failExhaustedStaleSending(
  timeoutSeconds: number,
): Promise<number> {
  const result =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where("status", "sending")
      .where(
        "attempts",
        ">=",
        MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
      )
      .where(
        "processing_started_at",
        "<",
        this.database.raw(
          `now() - (? * interval '1 second')`,
          [timeoutSeconds],
        ),
      )
      .update({
        status: "failed",
        failed_at: this.database.fn.now(),
        processing_started_at: null,
        next_attempt_at: null,
        error_code: "MAX_ATTEMPTS_EXCEEDED",
        error_message: "Maximum notification delivery attempts exceeded.",
        updated_at: this.database.fn.now(),
      });

  return result;
}

async claimPending(): Promise<
  NotificationDelivery | undefined
> {
  return this.database.transaction(
    async (transaction) => {
      const delivery =
        await transaction<NotificationDelivery>(
          "notification_deliveries",
        )
          .where({
            status: "pending",
          })
          .where((query) => {
            query
              .whereNull("next_attempt_at")
              .orWhere(
                "next_attempt_at",
                "<=",
                transaction.fn.now(),
              );
          })
          .orderBy("created_at", "asc")
          .forUpdate()
          .skipLocked()
          .first();

      if (!delivery) {
        return undefined;
      }

      const [claimedDelivery] =
        await transaction<NotificationDelivery>(
          "notification_deliveries",
        )
          .where({
            id: delivery.id,
            status: "pending",
          })
          .update({
            status: "sending",
            attempts: transaction.raw(
              "attempts + 1",
            ),
            processing_started_at:
              transaction.fn.now(),
            next_attempt_at: null,
            updated_at: transaction.fn.now(),
          })
          .returning("*");

      return claimedDelivery;
    },
  );
}

async scheduleRetry(
  id: string,
  delaySeconds: number,
  data: MarkNotificationDeliveryFailedData = {},
): Promise<NotificationDelivery | undefined> {
  const [delivery] =
    await this.database<NotificationDelivery>(
      "notification_deliveries",
    )
      .where({
        id,
        status: "sending",
      })
      .where(
        "attempts",
        "<",
        MAX_NOTIFICATION_DELIVERY_ATTEMPTS,
      )
      .update({
        status: "pending",
        processing_started_at: null,
        next_attempt_at: this.database.raw(
          `now() + (? * interval '1 second')`,
          [delaySeconds],
        ),
        error_code: data.error_code ?? null,
        error_message: data.error_message ?? null,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

  return delivery;
}


}
