import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../src/database/knex.js";

import {
  OtpDeliveryRepository,
  MAX_OTP_DELIVERY_ATTEMPTS,
} from "../../src/database/repositories/otp-delivery.repository.js";

import {
  OtpRepository,
} from "../../src/database/repositories/otp.repository.js";

import {
  OtpCryptoService,
} from "../../src/services/otp-crypto.service.js";

import {
  OtpDeliveryWorker,
} from "../../src/notifications/otp-delivery.worker.js";

import {
  WhatsAppProviderError,
} from "../../src/notifications/providers/whatsapp.provider.js";

import type {
  WhatsAppMessage,
  WhatsAppProvider,
} from "../../src/notifications/providers/whatsapp.provider.js";

import { cleanDatabase } from "../helpers/database.js";

describe("OtpDeliveryWorker", () => {
  let otpRepository: OtpRepository;
  let deliveryRepository: OtpDeliveryRepository;
  let otpCryptoService: OtpCryptoService;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();

    otpRepository = new OtpRepository(db);
    deliveryRepository = new OtpDeliveryRepository(db);
    otpCryptoService = new OtpCryptoService();
  });

  async function createOtpDelivery(
    code = "123456",
  ) {
    const [session] = await db("sessions")
      .insert({
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
      })
      .returning("*");

    const otp = await otpRepository.create({
      session_id: session.id,
      phone: "22890000000",
      code_hash: otpCryptoService.hash(code),
      expires_at: new Date(
        Date.now() + 5 * 60 * 1000,
      ),
    });

    const delivery =
      await deliveryRepository.create({
        otp_verification_id: otp.id,
        recipient_phone: otp.phone,
        encrypted_code:
          otpCryptoService.encrypt(code),
      });

    return delivery;
  }

  it("should send a pending OTP through WhatsApp", async () => {
    const delivery =
      await createOtpDelivery("123456");

    const sentMessages: WhatsAppMessage[] = [];

    const whatsappProvider: WhatsAppProvider = {
      send: async (message) => {
        sentMessages.push(message);

        return {
          providerMessageId: "wamid.otp-123",
        };
      },
    };

    const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

    const processed =
      await worker.processNext();

    expect(processed).toBe(true);

    expect(sentMessages).toHaveLength(1);

    expect(sentMessages[0]).toEqual({
      to: "22890000000",
      template: {
        name: "verification_code",
        language: "fr",
        otp: "123456",
      },
    });

    const updatedDelivery =
      await deliveryRepository.findById(
        delivery.id,
      );

    expect(updatedDelivery?.status).toBe("sent");
    expect(
      updatedDelivery?.provider_message_id,
    ).toBe("wamid.otp-123");
    expect(updatedDelivery?.attempts).toBe(1);
    expect(
      updatedDelivery?.processing_started_at,
    ).toBeNull();
  });

it("should permanently fail when the encrypted OTP is invalid", async () => {
  const delivery =
    await createOtpDelivery("123456");

  await db("otp_deliveries")
    .where({ id: delivery.id })
    .update({
      encrypted_code: "invalid-encrypted-payload",
    });

  const whatsappProvider: WhatsAppProvider = {
    send: async () => {
      throw new Error(
        "Provider should not be called",
      );
    },
  };

  const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

  const processed =
    await worker.processNext();

  expect(processed).toBe(true);

  const updatedDelivery =
    await deliveryRepository.findById(
      delivery.id,
    );

  expect(updatedDelivery?.status).toBe(
    "failed",
  );
  expect(updatedDelivery?.attempts).toBe(1);
  expect(
    updatedDelivery?.processing_started_at,
  ).toBeNull();
  expect(
    updatedDelivery?.next_attempt_at,
  ).toBeNull();
  expect(updatedDelivery?.error_code).toBe(
    "OTP_DECRYPTION_ERROR",
  );
});

it("should permanently fail when the OTP has expired", async () => {
  const delivery =
    await createOtpDelivery("123456");

  await db("otp_verifications")
    .where({
      id: delivery.otp_verification_id,
    })
    .update({
      expires_at: new Date(
        Date.now() - 60 * 1000,
      ),
    });

  const whatsappProvider: WhatsAppProvider = {
    send: async () => {
      throw new Error(
        "Provider should not be called",
      );
    },
  };

  const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

  const processed =
    await worker.processNext();

  expect(processed).toBe(true);

  const updatedDelivery =
    await deliveryRepository.findById(
      delivery.id,
    );

  expect(updatedDelivery?.status).toBe(
    "failed",
  );
  expect(updatedDelivery?.attempts).toBe(1);
  expect(
    updatedDelivery?.processing_started_at,
  ).toBeNull();
  expect(
    updatedDelivery?.next_attempt_at,
  ).toBeNull();
  expect(updatedDelivery?.error_code).toBe(
    "OTP_EXPIRED",
  );
});


  it("should return false when there is no pending OTP delivery", async () => {
    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error(
          "Provider should not be called",
        );
      },
    };

    const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

    const processed =
      await worker.processNext();

    expect(processed).toBe(false);
  });

  it("should schedule a retry when WhatsApp sending fails", async () => {
    const delivery =
      await createOtpDelivery("123456");

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error(
          "WhatsApp temporarily unavailable",
        );
      },
    };

    const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

    const processed =
      await worker.processNext();

    expect(processed).toBe(true);

    const updatedDelivery =
      await deliveryRepository.findById(
        delivery.id,
      );

    expect(updatedDelivery?.status).toBe(
      "pending",
    );
    expect(updatedDelivery?.attempts).toBe(1);
    expect(
      updatedDelivery?.processing_started_at,
    ).toBeNull();
    expect(
      updatedDelivery?.next_attempt_at,
    ).not.toBeNull();
    expect(updatedDelivery?.error_code).toBe(
      "OTP_DELIVERY_ERROR",
    );
    expect(updatedDelivery?.error_message).toBe(
      "WhatsApp temporarily unavailable",
    );
  });

  it("should permanently fail when WhatsApp returns a permanent error", async () => {
    const delivery =
      await createOtpDelivery("123456");

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new WhatsAppProviderError(
          "Recipient phone number is invalid",
          "permanent",
          "INVALID_RECIPIENT",
        );
      },
    };

    const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

    const processed =
      await worker.processNext();

    expect(processed).toBe(true);

    const updatedDelivery =
      await deliveryRepository.findById(
        delivery.id,
      );

    expect(updatedDelivery?.status).toBe(
      "failed",
    );
    expect(updatedDelivery?.attempts).toBe(1);
    expect(
      updatedDelivery?.processing_started_at,
    ).toBeNull();
    expect(
      updatedDelivery?.next_attempt_at,
    ).toBeNull();
    expect(updatedDelivery?.error_code).toBe(
      "INVALID_RECIPIENT",
    );
    expect(updatedDelivery?.error_message).toBe(
      "Recipient phone number is invalid",
    );
  });

  it("should mark the delivery as failed after the maximum attempts", async () => {
    const delivery =
      await createOtpDelivery("123456");

    const whatsappProvider: WhatsAppProvider = {
      send: async () => {
        throw new Error("WhatsApp unavailable");
      },
    };

    const worker = new OtpDeliveryWorker(
  deliveryRepository,
  otpRepository,
  otpCryptoService,
  whatsappProvider,
);

    await worker.processNext();

    await db("otp_deliveries")
      .where({ id: delivery.id })
      .update({
        next_attempt_at: db.fn.now(),
      });

    await worker.processNext();

    await db("otp_deliveries")
      .where({ id: delivery.id })
      .update({
        next_attempt_at: db.fn.now(),
      });

    await worker.processNext();

    const updatedDelivery =
      await deliveryRepository.findById(
        delivery.id,
      );

    expect(updatedDelivery?.status).toBe(
      "failed",
    );
    expect(updatedDelivery?.attempts).toBe(
      MAX_OTP_DELIVERY_ATTEMPTS,
    );
    expect(
      updatedDelivery?.processing_started_at,
    ).toBeNull();
    expect(
      updatedDelivery?.next_attempt_at,
    ).toBeNull();
    expect(updatedDelivery?.error_code).toBe(
      "MAX_ATTEMPTS_EXCEEDED",
    );
    expect(updatedDelivery?.error_message).toBe(
      "WhatsApp unavailable",
    );
  });
});
