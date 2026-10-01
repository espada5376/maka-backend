import { beforeEach, describe, expect, it } from "vitest";

import db from "../../../src/database/knex.js";
import { OtpDeliveryRepository, MAX_OTP_DELIVERY_ATTEMPTS } from "../../../src/database/repositories/otp-delivery.repository.js";
import { OtpRepository } from "../../../src/database/repositories/otp.repository.js";

describe("OtpDeliveryRepository", () => {
  const otpRepository = new OtpRepository();
  const deliveryRepository = new OtpDeliveryRepository();

    beforeEach(async () => {
    await db("otp_deliveries").del();
    await db("otp_verifications").del();
    await db("sessions").del();
  });

  async function createOtp() {
  const [session] = await db("sessions")
    .insert({
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning("*");

  return otpRepository.create({
    session_id: session.id,
    phone: "+22890000000",
    code_hash: "test-hash",
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
  });
}

  it("creates an OTP delivery", async () => {
    const otp = await createOtp();

    const delivery = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    expect(delivery.id).toBeDefined();
    expect(delivery.otp_verification_id).toBe(otp.id);
    expect(delivery.recipient_phone).toBe(otp.phone);
    expect(delivery.encrypted_code).toBe("encrypted-test-code");
    expect(delivery.status).toBe("pending");
    expect(delivery.attempts).toBe(0);
    expect(delivery.provider_message_id).toBeNull();
    expect(delivery.sent_at).toBeNull();
    expect(delivery.failed_at).toBeNull();
  });

  it("finds a delivery by id", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    const found = await deliveryRepository.findById(created.id);

    expect(found?.id).toBe(created.id);
  });

  it("returns undefined for an unknown id", async () => {
    const found = await deliveryRepository.findById(
      "00000000-0000-0000-0000-000000000999",
    );

    expect(found).toBeUndefined();
  });

  it("finds a delivery by OTP verification id", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    const found =
      await deliveryRepository.findByOtpVerificationId(otp.id);

    expect(found?.id).toBe(created.id);
  });

  it("returns undefined when no delivery exists for an OTP", async () => {
    const otp = await createOtp();

    const found =
      await deliveryRepository.findByOtpVerificationId(otp.id);

    expect(found).toBeUndefined();
  });

  it("marks a pending delivery as sending", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    const sending = await deliveryRepository.markSending(created.id);

    expect(sending?.status).toBe("sending");
    expect(sending?.attempts).toBe(1);
    expect(sending?.processing_started_at).not.toBeNull();
    expect(sending?.next_attempt_at).toBeNull();
  });

  it("does not mark a non-pending delivery as sending", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await deliveryRepository.markSending(created.id);

    const result = await deliveryRepository.markSending(created.id);

    expect(result).toBeUndefined();
  });

  it("marks a sending delivery as sent", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await deliveryRepository.markSending(created.id);

    const sent = await deliveryRepository.markSent(created.id, {
      provider_message_id: "provider-message-123",
    });

    expect(sent?.status).toBe("sent");
    expect(sent?.provider_message_id).toBe("provider-message-123");
    expect(sent?.sent_at).not.toBeNull();
    expect(sent?.processing_started_at).toBeNull();
  });

  it("marks a delivery as failed", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    const failed = await deliveryRepository.markFailed(created.id, {
      error_code: "TEST_ERROR",
      error_message: "Test failure",
    });

    expect(failed?.status).toBe("failed");
    expect(failed?.failed_at).not.toBeNull();
    expect(failed?.error_code).toBe("TEST_ERROR");
    expect(failed?.error_message).toBe("Test failure");
  });

  it("schedules a retry for a sending delivery", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await deliveryRepository.markSending(created.id);

    const retry = await deliveryRepository.scheduleRetry(
      created.id,
      60,
      {
        error_code: "TEMP_ERROR",
        error_message: "Temporary failure",
      },
    );

    expect(retry?.status).toBe("pending");
    expect(retry?.next_attempt_at).not.toBeNull();
    expect(retry?.processing_started_at).toBeNull();
    expect(retry?.error_code).toBe("TEMP_ERROR");
  });

  it("claims a pending delivery", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    const claimed = await deliveryRepository.claimPending();

    expect(claimed?.id).toBe(created.id);
    expect(claimed?.status).toBe("sending");
    expect(claimed?.attempts).toBe(1);
    expect(claimed?.processing_started_at).not.toBeNull();
  });

  it("does not claim an already sent delivery", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await deliveryRepository.markSending(created.id);
    await deliveryRepository.markSent(created.id, {
      provider_message_id: "provider-message-123",
    });

    const claimed = await deliveryRepository.claimPending();

    expect(claimed).toBeUndefined();
  });

  it("requeues stale sending deliveries", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await deliveryRepository.markSending(created.id);

    await db("otp_deliveries")
      .where({ id: created.id })
      .update({
        processing_started_at: db.raw(
          "now() - interval '120 seconds'",
        ),
      });

    const count =
      await deliveryRepository.requeueStaleSending(60);

    expect(count).toBe(1);

    const delivery =
      await deliveryRepository.findById(created.id);

    expect(delivery?.status).toBe("pending");
    expect(delivery?.processing_started_at).toBeNull();
  });

  it("fails exhausted stale sending deliveries", async () => {
    const otp = await createOtp();

    const created = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await db("otp_deliveries")
      .where({ id: created.id })
      .update({
        status: "sending",
        attempts: 3,
        processing_started_at: db.raw(
          "now() - interval '120 seconds'",
        ),
      });

    const count =
      await deliveryRepository.failExhaustedStaleSending(60);

    expect(count).toBe(1);

    const delivery =
      await deliveryRepository.findById(created.id);

    expect(delivery?.status).toBe("failed");
    expect(delivery?.error_code).toBe(
      "MAX_ATTEMPTS_EXCEEDED",
    );
    expect(delivery?.failed_at).not.toBeNull();
  });

  it("rejects a second delivery for the same OTP verification", async () => {
    const otp = await createOtp();

    await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await expect(
      deliveryRepository.create({
        otp_verification_id: otp.id,
        recipient_phone: otp.phone,
        encrypted_code: "another-encrypted-code",
      }),
    ).rejects.toThrow();
  });

  it("cascades when the OTP verification is deleted", async () => {
    const otp = await createOtp();

    const delivery = await deliveryRepository.create({
      otp_verification_id: otp.id,
      recipient_phone: otp.phone,
      encrypted_code: "encrypted-test-code",
    });

    await db("otp_verifications")
      .where({ id: otp.id })
      .delete();

    const found = await deliveryRepository.findById(delivery.id);

    expect(found).toBeUndefined();
  });

it("does not claim a delivery that already reached the maximum attempts", async () => {
  const otp = await createOtp();

  const delivery = await deliveryRepository.create({
    otp_verification_id: otp.id,
    recipient_phone: otp.phone,
    encrypted_code: "encrypted-code",
  });

  await db("otp_deliveries")
    .where({ id: delivery.id })
    .update({
      attempts: MAX_OTP_DELIVERY_ATTEMPTS,
    });

  const claimed = await deliveryRepository.claimPending();

  expect(claimed).toBeUndefined();

  const stored = await deliveryRepository.findById(delivery.id);

  expect(stored).toBeDefined();
  expect(stored?.status).toBe("pending");
  expect(stored?.attempts).toBe(MAX_OTP_DELIVERY_ATTEMPTS);
});

});
