import { describe, expect, it, beforeEach, afterAll } from "vitest";

import db from "../../../src/database/knex";
import {
  OtpRepository,
  type OtpVerification,
} from "../../../src/database/repositories/otp.repository.js";

describe("OtpRepository", () => {
  const repository = new OtpRepository(db);

  let sessionId: string;

  beforeEach(async () => {
    const [session] = await db("sessions")
      .insert({
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      })
      .returning("id");

    sessionId = session.id;

    await db("otp_verifications").del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("create", () => {
    it("creates an OTP verification", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      expect(otp).toMatchObject({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        attempts: 0,
        consumed_at: null,
        invalidated_at: null,
      });

      expect(otp.id).toBeDefined();
      expect(otp.created_at).toBeInstanceOf(Date);
      expect(otp.expires_at).toBeInstanceOf(Date);
    });
  });

  describe("findById", () => {
    it("finds an OTP by id", async () => {
      const created = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const otp = await repository.findById(created.id);

      expect(otp).toBeDefined();
      expect(otp?.id).toBe(created.id);
    });

    it("returns undefined when the OTP does not exist", async () => {
      const otp = await repository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

      expect(otp).toBeUndefined();
    });
  });

  describe("findLatestActive", () => {
    it("returns the latest active OTP", async () => {
      await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "old-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const latest = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "new-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const otp = await repository.findLatestActive(
        sessionId,
        "+22890000000",
      );

      expect(otp?.id).toBe(latest.id);
    });

    it("does not return a consumed OTP", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      await repository.consume(otp.id);

      const result = await repository.findLatestActive(
        sessionId,
        "+22890000000",
      );

      expect(result).toBeUndefined();
    });

    it("does not return an invalidated OTP", async () => {
      await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      await repository.invalidateActive(
        sessionId,
        "+22890000000",
      );

      const result = await repository.findLatestActive(
        sessionId,
        "+22890000000",
      );

      expect(result).toBeUndefined();
    });

    it("does not return an expired OTP", async () => {
      await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() - 1000),
      });

      const result = await repository.findLatestActive(
        sessionId,
        "+22890000000",
      );

      expect(result).toBeUndefined();
    });

    it("does not return an OTP belonging to another session", async () => {
      const [otherSession] = await db("sessions")
        .insert({
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning("id");

      await repository.create({
        session_id: otherSession.id,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const result = await repository.findLatestActive(
        sessionId,
        "+22890000000",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("invalidateActive", () => {
    it("invalidates active OTPs for the session and phone", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const count = await repository.invalidateActive(
        sessionId,
        "+22890000000",
      );

      expect(count).toBe(1);

      const updated = await repository.findById(otp.id);

      expect(updated?.invalidated_at).toBeInstanceOf(Date);
    });

    it("does not invalidate OTPs for another phone", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      await repository.invalidateActive(
        sessionId,
        "+22891111111",
      );

      const unchanged = await repository.findById(otp.id);

      expect(unchanged?.invalidated_at).toBeNull();
    });
  });

  describe("incrementAttempts", () => {
    it("increments the attempt counter", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const updated = await repository.incrementAttempts(
        otp.id,
      );

      expect(updated?.attempts).toBe(1);

      const updatedAgain =
        await repository.incrementAttempts(otp.id);

      expect(updatedAgain?.attempts).toBe(2);
    });
  });

  describe("consume", () => {
    it("consumes an active OTP", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      const consumed = await repository.consume(otp.id);

      expect(consumed?.consumed_at).toBeInstanceOf(Date);
    });

    it("does not consume an already consumed OTP", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      await repository.consume(otp.id);

      const secondAttempt =
        await repository.consume(otp.id);

      expect(secondAttempt).toBeUndefined();
    });

    it("does not consume an invalidated OTP", async () => {
      const otp = await repository.create({
        session_id: sessionId,
        phone: "+22890000000",
        code_hash: "hashed-code",
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      await repository.invalidateActive(
        sessionId,
        "+22890000000",
      );

      const result = await repository.consume(otp.id);

      expect(result).toBeUndefined();
    });
  });
});
