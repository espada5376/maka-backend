import { Knex } from "knex";
import db from "../knex.js";

export interface OtpVerification {
  id: string;
  session_id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  invalidated_at: Date | null;
  created_at: Date;
}

export interface CreateOtpVerificationData {
  session_id: string;
  phone: string;
  code_hash: string;
  expires_at: Date;
}

export class OtpRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(
    id: string,
  ): Promise<OtpVerification | undefined> {
    return this.database<OtpVerification>(
      "otp_verifications",
    )
      .where({ id })
      .first();
  }

  async findLatestActive(
    sessionId: string,
    phone: string,
  ): Promise<OtpVerification | undefined> {
    return this.database<OtpVerification>(
      "otp_verifications",
    )
      .where({
        session_id: sessionId,
        phone,
      })
      .whereNull("consumed_at")
      .whereNull("invalidated_at")
      .where("expires_at", ">", this.database.fn.now())
      .orderBy("created_at", "desc")
      .first();
  }

  async create(
  data: CreateOtpVerificationData,
  database: Knex = this.database,
): Promise<OtpVerification> {
  const [otp] = await database<OtpVerification>(
    "otp_verifications",
  )
    .insert({
      session_id: data.session_id,
      phone: data.phone,
      code_hash: data.code_hash,
      expires_at: data.expires_at,
    })
    .returning("*");

  return otp;
}

async invalidateActive(
  sessionId: string,
  phone: string,
  database: Knex = this.database,
): Promise<number> {
  return database<OtpVerification>(
    "otp_verifications",
  )
    .where({
      session_id: sessionId,
      phone,
    })
    .whereNull("consumed_at")
    .whereNull("invalidated_at")
    .update({
      invalidated_at: database.fn.now(),
    });
}

  async incrementAttempts(
  id: string,
  database: Knex = this.database,
): Promise<OtpVerification | undefined> {
  const [otp] = await database<OtpVerification>("otp_verifications")
    .where({ id })
    .increment("attempts", 1)
    .returning("*");

  return otp;
}

  async consume(
  id: string,
  database: Knex = this.database,
): Promise<OtpVerification | undefined> {
  const [otp] = await database<OtpVerification>("otp_verifications")
    .where({ id })
    .whereNull("consumed_at")
    .whereNull("invalidated_at")
    .update({
      consumed_at: database.fn.now(),
    })
    .returning("*");

  return otp;
}

async findLatestPending(
  sessionId: string,
  phone: string,
): Promise<OtpVerification | undefined> {
  return this.database<OtpVerification>("otp_verifications")
    .where({
      session_id: sessionId,
      phone,
    })
    .whereNull("consumed_at")
    .whereNull("invalidated_at")
    .orderBy("created_at", "desc")
    .first();
}

async findLatestPendingForUpdate(
  sessionId: string,
  phone: string,
  database: Knex = this.database,
): Promise<OtpVerification | undefined> {
  return database<OtpVerification>("otp_verifications")
    .where({
      session_id: sessionId,
      phone,
    })
    .whereNull("consumed_at")
    .whereNull("invalidated_at")
    .orderBy("created_at", "desc")
    .forUpdate()
    .first();
}

}
