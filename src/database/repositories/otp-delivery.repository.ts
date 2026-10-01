import { Knex } from "knex";

import db from "../knex.js";

export type OtpDeliveryStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed";

export interface OtpDelivery {
  id: string;
  otp_verification_id: string;
  recipient_phone: string;
  encrypted_code: string;
  status: OtpDeliveryStatus;
  attempts: number;
  provider_message_id: string | null;
  sent_at: Date | null;
  failed_at: Date | null;
  processing_started_at: Date | null;
  next_attempt_at: Date | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOtpDeliveryData {
  otp_verification_id: string;
  recipient_phone: string;
  encrypted_code: string;
}

export interface MarkOtpDeliverySentData {
  provider_message_id: string;
}

export interface MarkOtpDeliveryFailedData {
  error_code?: string | null;
  error_message?: string | null;
}

export const MAX_OTP_DELIVERY_ATTEMPTS = 3;

export class OtpDeliveryRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<OtpDelivery | undefined> {
    return this.database<OtpDelivery>("otp_deliveries")
      .where({ id })
      .first();
  }

  async findByOtpVerificationId(
    otpVerificationId: string,
  ): Promise<OtpDelivery | undefined> {
    return this.database<OtpDelivery>("otp_deliveries")
      .where({
        otp_verification_id: otpVerificationId,
      })
      .first();
  }

  async create(
    data: CreateOtpDeliveryData,
    database: Knex = this.database,
  ): Promise<OtpDelivery> {
    const [delivery] = await database<OtpDelivery>("otp_deliveries")
      .insert({
        otp_verification_id: data.otp_verification_id,
        recipient_phone: data.recipient_phone,
        encrypted_code: data.encrypted_code,
        status: "pending",
        attempts: 0,
        next_attempt_at: null,
      })
      .returning("*");

    return delivery;
  }

  async markSending(
    id: string,
  ): Promise<OtpDelivery | undefined> {
    const [delivery] = await this.database<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        id,
        status: "pending",
      })
      .update({
        status: "sending",
        attempts: this.database.raw("attempts + 1"),
        processing_started_at: this.database.fn.now(),
        next_attempt_at: null,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return delivery;
  }

  async markSent(
    id: string,
    data: MarkOtpDeliverySentData,
  ): Promise<OtpDelivery | undefined> {
    const [delivery] = await this.database<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        id,
        status: "sending",
      })
      .update({
        status: "sent",
        provider_message_id: data.provider_message_id,
        sent_at: this.database.fn.now(),
        processing_started_at: null,
        next_attempt_at: null,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return delivery;
  }

  async markFailed(
    id: string,
    data: MarkOtpDeliveryFailedData = {},
  ): Promise<OtpDelivery | undefined> {
    const [delivery] = await this.database<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        id,
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

  async scheduleRetry(
    id: string,
    delaySeconds: number,
    data: MarkOtpDeliveryFailedData = {},
  ): Promise<OtpDelivery | undefined> {
    const [delivery] = await this.database<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        id,
        status: "sending",
      })
      .where(
        "attempts",
        "<",
        MAX_OTP_DELIVERY_ATTEMPTS,
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

  async claimPending(): Promise<OtpDelivery | undefined> {
  return this.database.transaction(async (transaction) => {
    const delivery = await transaction<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        status: "pending",
      })
      .where(
        "attempts",
        "<",
        MAX_OTP_DELIVERY_ATTEMPTS,
      )
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

    const [claimedDelivery] = await transaction<OtpDelivery>(
      "otp_deliveries",
    )
      .where({
        id: delivery.id,
        status: "pending",
      })
      .where(
        "attempts",
        "<",
        MAX_OTP_DELIVERY_ATTEMPTS,
      )
      .update({
        status: "sending",
        attempts: transaction.raw("attempts + 1"),
        processing_started_at: transaction.fn.now(),
        next_attempt_at: null,
        updated_at: transaction.fn.now(),
      })
      .returning("*");

    return claimedDelivery;
  });
}

  async requeueStaleSending(
    timeoutSeconds: number,
  ): Promise<number> {
    return this.database<OtpDelivery>("otp_deliveries")
      .where({
        status: "sending",
      })
      .where(
        "processing_started_at",
        "<=",
        this.database.raw(
          `now() - (? * interval '1 second')`,
          [timeoutSeconds],
        ),
      )
      .update({
        status: "pending",
        processing_started_at: null,
        next_attempt_at: null,
        updated_at: this.database.fn.now(),
      });
  }

  async failExhaustedStaleSending(
    timeoutSeconds: number,
  ): Promise<number> {
    return this.database<OtpDelivery>("otp_deliveries")
      .where({
        status: "sending",
      })
      .where(
        "attempts",
        ">=",
        MAX_OTP_DELIVERY_ATTEMPTS,
      )
      .where(
        "processing_started_at",
        "<=",
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
        error_message: "Maximum delivery attempts exceeded.",
        updated_at: this.database.fn.now(),
      });
  }
}
