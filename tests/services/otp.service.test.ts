import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  OtpDeliveryRepository,
} from "../../src/database/repositories/otp-delivery.repository.js";

import {
  OtpCryptoService,
} from "../../src/services/otp-crypto.service.js";

import db from "../../src/database/knex.js";
import { OtpRepository } from "../../src/database/repositories/otp.repository.js";
import { OtpService } from "../../src/services/otp.service.js";


describe("OtpService", () => {
  const otpRepository = new OtpRepository();
  const otpDeliveryRepository =
    new OtpDeliveryRepository();
  const otpCryptoService = new OtpCryptoService();

  const otpService = new OtpService(
    otpRepository,
    db,
    otpCryptoService,
    otpDeliveryRepository,
  );

  let sessionId: string;

  async function getDeliveryCode(
  otpId: string,
): Promise<string> {
  const delivery =
    await otpDeliveryRepository.findByOtpVerificationId(
      otpId,
    );

  if (!delivery) {
    throw new Error(
      "OTP delivery not found",
    );
  }

  return otpCryptoService.decrypt(
    delivery.encrypted_code,
  );
}

  beforeEach(async () => {
    await db("otp_deliveries").del();
await db("otp_verifications").del();
await db("sessions").del();

    const [session] = await db("sessions")
      .insert({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning("*");

    sessionId = session.id;
  });

  it("requests an OTP and creates its delivery", async () => {
  const result = await otpService.requestOtp(
    sessionId,
    "+22890000000",
  );

  expect(result.session_id).toBe(sessionId);
  expect(result.phone).toBe("+22890000000");
  expect(result.code_hash).toBeDefined();

  const delivery =
    await otpDeliveryRepository.findByOtpVerificationId(
      result.id,
    );

  expect(delivery).toBeDefined();
  expect(delivery?.otp_verification_id).toBe(
    result.id,
  );
  expect(delivery?.recipient_phone).toBe(
    "+22890000000",
  );
  expect(delivery?.status).toBe("pending");
  expect(delivery?.attempts).toBe(0);

  const decryptedCode =
    otpCryptoService.decrypt(
      delivery!.encrypted_code,
    );

  expect(decryptedCode).toMatch(/^\d{6}$/);
  expect(
    otpCryptoService.verify(
      decryptedCode,
      result.code_hash,
    ),
  ).toBe(true);
});

it("rolls back the OTP transaction when delivery creation fails", async () => {
  const phone = "+22890000000";

  const firstOtp = await otpService.requestOtp(
    sessionId,
    phone,
  );

  const createDeliverySpy = vi
    .spyOn(otpDeliveryRepository, "create")
    .mockRejectedValueOnce(
      new Error("Failed to create OTP delivery"),
    );

  await expect(
    otpService.requestOtp(sessionId, phone),
  ).rejects.toThrow("Failed to create OTP delivery");

  createDeliverySpy.mockRestore();

  const firstOtpAfterFailure =
    await otpRepository.findById(firstOtp.id);

  expect(firstOtpAfterFailure).not.toBeNull();
  expect(firstOtpAfterFailure?.invalidated_at).toBeNull();

  const otps = await db("otp_verifications")
    .where({
      session_id: sessionId,
      phone,
    })
    .select("*");

  expect(otps).toHaveLength(1);

  const deliveries = await db("otp_deliveries")
    .whereIn(
      "otp_verification_id",
      otps.map((otp) => otp.id),
    )
    .select("*");

  expect(deliveries).toHaveLength(1);
});


  it("verifies a valid OTP", async () => {
    const requested = await otpService.requestOtp(
      sessionId,
      "+22890000000",
    );

    const code = await getDeliveryCode(
  requested.id,
);

     const verified = await otpService.verifyOtp(
    sessionId,
    "+22890000000",
    code,
  );


    expect(verified.id).toBe(requested.id);
    expect(verified.consumed_at).not.toBeNull();
  });

  it("rejects an invalid OTP", async () => {
    await otpService.requestOtp(
      sessionId,
      "+22890000000",
    );

    await expect(
      otpService.verifyOtp(
        sessionId,
        "+22890000000",
        "000000",
      ),
    ).rejects.toMatchObject({
      code: "OTP_INVALID",
    });
  });

  it("cannot verify a consumed OTP", async () => {
    const requested = await otpService.requestOtp(
      sessionId,
      "+22890000000",
    );

      const code = await getDeliveryCode(
    requested.id,
  );

    await otpService.verifyOtp(
      sessionId,
      "+22890000000",
      code,
    );

    await expect(
      otpService.verifyOtp(
        sessionId,
        "+22890000000",
        code,
      ),
    ).rejects.toMatchObject({
      code: "OTP_NOT_FOUND",
    });
  });

it("rejects an expired OTP", async () => {
  const requested = await otpService.requestOtp(
    sessionId,
    "+22890000000",
  );

   
  const code = await getDeliveryCode(
    requested.id,
  );

  await db("otp_verifications")
    .where({ id: requested.id })
    .update({
      expires_at: new Date(Date.now() - 1000),
    });

  await expect(
    otpService.verifyOtp(
      sessionId,
      "+22890000000",
      code,
    ),
  ).rejects.toMatchObject({
    code: "OTP_EXPIRED",
  });
});

it("rejects the OTP after five invalid attempts", async () => {
  const requested = await otpService.requestOtp(
    sessionId,
    "+22890000000",
  );

  for (let attempt = 1; attempt <= 5; attempt++) {
  await expect(
    otpService.verifyOtp(
      sessionId,
      "+22890000000",
      "000000",
    ),
  ).rejects.toMatchObject({
    code: "OTP_INVALID",
  });
}

const otp = await otpRepository.findById(requested.id);

expect(otp?.attempts).toBe(5);

await expect(
  otpService.verifyOtp(
    sessionId,
    "+22890000000",
    "000000",
  ),
).rejects.toMatchObject({
  code: "OTP_MAX_ATTEMPTS",
});
});

it("invalidates the previous OTP when requesting a new one", async () => {
  
const first = await otpService.requestOtp(sessionId, "+22890000000");
const firstCode = await getDeliveryCode(first.id);

const second = await otpService.requestOtp(sessionId, "+22890000000");
const secondCode = await getDeliveryCode(second.id);

const firstOtp = await otpRepository.findById(first.id);
const secondOtp = await otpRepository.findById(second.id);

expect(firstOtp?.invalidated_at).not.toBeNull();
expect(secondOtp?.invalidated_at).toBeNull();

await expect(
  otpService.verifyOtp(
    sessionId,
    +22890000000,
    firstCode,
  ),
).rejects.toMatchObject({
  code: "OTP_NOT_FOUND",
});

});

});
