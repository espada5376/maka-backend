import { Knex } from "knex";
import db from "../database/knex.js";
import { randomInt } from "node:crypto";

import { UserRepository } from "../database/repositories/user.repository.js";
import { SessionRepository } from "../database/repositories/session.repository.js";

import { OtpCryptoService } from "./otp-crypto.service.js";
import {
  OtpRepository,
  type OtpVerification,
} from "../database/repositories/otp.repository.js";
import { OtpDeliveryRepository } from "../database/repositories/otp-delivery.repository.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";

const OTP_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export class OtpService {
  constructor(
    private readonly otpRepository: OtpRepository = new OtpRepository(),
    private readonly database: Knex = db,
    private readonly otpCryptoService: OtpCryptoService = new OtpCryptoService(),
    private readonly otpDeliveryRepository: OtpDeliveryRepository = new OtpDeliveryRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly sessionRepository: SessionRepository = new SessionRepository(),
  ) {}

  async requestOtp(sessionId: string, phone: string): Promise<OtpVerification> {
    return this.database.transaction(async (trx) => {
      await this.otpRepository.invalidateActive(sessionId, phone, trx);

      const code = this.generateCode();

      const codeHash = this.otpCryptoService.hash(code);

      const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);

      const otp = await this.otpRepository.create(
        {
          session_id: sessionId,
          phone,
          code_hash: codeHash,
          expires_at: expiresAt,
        },
        trx,
      );

      await this.otpDeliveryRepository.create(
        {
          otp_verification_id: otp.id,
          recipient_phone: phone,
          encrypted_code: this.otpCryptoService.encrypt(code),
        },
        trx,
      );

      return otp;
    });
  }

  async verifyOtp(
    sessionId: string,
    phone: string,
    code: string,
  ): Promise<OtpVerification> {
    const result = await this.database.transaction(async (trx) => {
      const otp = await this.otpRepository.findLatestPendingForUpdate(
        sessionId,
        phone,
        trx,
      );

      if (!otp) {
        return { type: "not_found" as const };
      }

      if (otp.expires_at.getTime() <= Date.now()) {
        return { type: "expired" as const };
      }

      if (otp.attempts >= MAX_ATTEMPTS) {
        return { type: "max_attempts" as const };
      }

      const normalizedCode = code.trim();

      if (!/^\d{6}$/.test(normalizedCode)) {
        const updatedOtp = await this.otpRepository.incrementAttempts(
          otp.id,
          trx,
        );

        return {
          type: "invalid" as const,
          attempts: updatedOtp?.attempts ?? otp.attempts + 1,
        };
      }

      const isValid = this.otpCryptoService.verify(
        normalizedCode,
        otp.code_hash,
      );

      if (!isValid) {
        const updatedOtp = await this.otpRepository.incrementAttempts(
          otp.id,
          trx,
        );

        return {
          type: "invalid" as const,
          attempts: updatedOtp?.attempts ?? otp.attempts + 1,
        };
      }

      let user = await this.userRepository.findByPhone(otp.phone, trx);

      if (!user) {
        user = await this.userRepository.create(
          {
            phone: otp.phone,
            name: null,
          },
          trx,
        );
      }

      const verifiedUser = await this.userRepository.markPhoneAsVerified(
        user.id,
        trx,
      );

      if (!verifiedUser) {
        throw new Error("Failed to verify user phone");
      }

      const updatedSession = await this.sessionRepository.update(
        sessionId,
        {
          user_id: user.id,
        },
        trx,
      );

      if (!updatedSession) {
        throw new Error("Session not found");
      }

      const consumed = await this.otpRepository.consume(otp.id, trx);

      if (!consumed) {
        return { type: "not_found" as const };
      }

      return {
        type: "success" as const,
        otp: consumed,
      };
    });

    if (result.type === "not_found") {
      throw createAppError(Errors.OTP_NOT_FOUND);
    }

    if (result.type === "expired") {
      throw createAppError(Errors.OTP_EXPIRED);
    }

    if (result.type === "max_attempts") {
      throw createAppError(Errors.OTP_MAX_ATTEMPTS);
    }

    if (result.type === "invalid") {
      throw createAppError(Errors.OTP_INVALID);
    }

    return result.otp;
  }

  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
