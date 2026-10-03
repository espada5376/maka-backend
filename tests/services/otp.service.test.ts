import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { UserRepository } from "../../src/database/repositories/user.repository.js";
import { SessionRepository } from "../../src/database/repositories/session.repository.js";

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
  
  const phone = "+22890123456";

  const userRepository = new UserRepository(db);
const sessionRepository = new SessionRepository(db);

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
await db("users").del();

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
    phone,
  );

  expect(result.session_id).toBe(sessionId);
  expect(result.phone).toBe(phone);
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
    phone,
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

it("normalizes the phone number when requesting and verifying an OTP", async () => {
  const formattedPhone = "+228 90 12 34 56";
  const normalizedPhone = "+22890123456";

  const otp = await otpService.requestOtp(
    sessionId,
    formattedPhone,
  );

  expect(otp.phone).toBe(normalizedPhone);

  const delivery =
    await otpDeliveryRepository.findByOtpVerificationId(
      otp.id,
    );

  expect(delivery?.recipient_phone).toBe(
    normalizedPhone,
  );

  const code = await getDeliveryCode(otp.id);

  const result = await otpService.verifyOtp(
    sessionId,
    formattedPhone,
    code,
  );

  expect(result.user.phone).toBe(normalizedPhone);
  expect(result.user.phone_verified_at).not.toBeNull();
});



it("rolls back the OTP transaction when delivery creation fails", async () => {
  

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
      phone,
    );

    const code = await getDeliveryCode(
  requested.id,
);

     const verified = await otpService.verifyOtp(
    sessionId,
    phone,
    code,
  );


    expect(verified.otp.id).toBe(requested.id);
expect(verified.otp.consumed_at).not.toBeNull();
expect(verified.user.phone).toBe(phone);
expect(verified.user.phone_verified_at).not.toBeNull();

  });

it("reuses an existing user when verifying a valid OTP", async () => {
  

  const existingUser = await userRepository.create({
    phone,
    name: "Test User",
  });


  const requested = await otpService.requestOtp(
    sessionId,
    phone,
  );


  const code = await getDeliveryCode(requested.id);

  const verified = await otpService.verifyOtp(
    sessionId,
    phone,
    code,
  );

  expect(verified.user.id).toBe(existingUser.id);

  const users = await db("users")
    .where({ phone });

  expect(users).toHaveLength(1);

  expect(verified.user.phone_verified_at).not.toBeNull();

  const session = await sessionRepository.findById(sessionId);

  expect(session?.user_id).toBe(existingUser.id);
});


it("rolls back authentication when session update fails", async () => {
  

  const failingSessionRepository = {
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionRepository;

  const failingOtpService = new OtpService(
    otpRepository,
    db,
    otpCryptoService,
    otpDeliveryRepository,
    userRepository,
    failingSessionRepository,
  );

  const requested = await failingOtpService.requestOtp(
    sessionId,
    phone,
  );

  const code = await getDeliveryCode(requested.id);

  await expect(
    failingOtpService.verifyOtp(
      sessionId,
      phone,
      code,
    ),
  ).rejects.toMatchObject({
    code: "SESSION_NOT_FOUND",
  });

  const user = await userRepository.findByPhone(phone);

  expect(user).toBeUndefined();

  const session = await sessionRepository.findById(sessionId);

  expect(session?.user_id).toBeNull();

  const otp = await otpRepository.findById(requested.id);

  expect(otp).toBeDefined();
  expect(otp?.consumed_at).toBeNull();
});

  it("rejects an invalid OTP", async () => {
    await otpService.requestOtp(
      sessionId,
      phone,
    );

    await expect(
      otpService.verifyOtp(
        sessionId,
        phone,
        "000000",
      ),
    ).rejects.toMatchObject({
      code: "OTP_INVALID",
    });
  });

  it("cannot verify a consumed OTP", async () => {
    const requested = await otpService.requestOtp(
      sessionId,
      phone,
    );

      const code = await getDeliveryCode(
    requested.id,
  );

    await otpService.verifyOtp(
      sessionId,
      phone,
      code,
    );

    await expect(
      otpService.verifyOtp(
        sessionId,
        phone,
        code,
      ),
    ).rejects.toMatchObject({
      code: "OTP_NOT_FOUND",
    });
  });

it("rejects an expired OTP", async () => {
  const requested = await otpService.requestOtp(
    sessionId,
    phone,
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
      phone,
      code,
    ),
  ).rejects.toMatchObject({
    code: "OTP_EXPIRED",
  });
});

it("rejects the OTP after five invalid attempts", async () => {
  const requested = await otpService.requestOtp(
    sessionId,
    phone,
  );

  for (let attempt = 1; attempt <= 5; attempt++) {
  await expect(
    otpService.verifyOtp(
      sessionId,
      phone,
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
    phone,
    "000000",
  ),
).rejects.toMatchObject({
  code: "OTP_MAX_ATTEMPTS",
});
});

it("invalidates the previous OTP when requesting a new one", async () => {
  const first = await otpService.requestOtp(sessionId, phone);
  const firstCode = await getDeliveryCode(first.id);

  const second = await otpService.requestOtp(sessionId, phone);

  const firstOtp = await otpRepository.findById(first.id);
  const secondOtp = await otpRepository.findById(second.id);

  expect(firstOtp?.invalidated_at).not.toBeNull();
  expect(secondOtp?.invalidated_at).toBeNull();

  await expect(
    otpService.verifyOtp(
      sessionId,
      phone,
      firstCode,
    ),
  ).rejects.toMatchObject({
    code: "OTP_INVALID",
  });
});

});
