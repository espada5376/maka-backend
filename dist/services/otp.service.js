import db from "../database/knex.js";
import { randomInt } from "node:crypto";
import { OtpCryptoService, } from "./otp-crypto.service.js";
import { OtpRepository, } from "../database/repositories/otp.repository.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
const OTP_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
export class OtpService {
    otpRepository;
    database;
    otpCryptoService;
    constructor(otpRepository = new OtpRepository(), database = db, otpCryptoService = new OtpCryptoService()) {
        this.otpRepository = otpRepository;
        this.database = database;
        this.otpCryptoService = otpCryptoService;
    }
    async requestOtp(sessionId, phone) {
        await this.otpRepository.invalidateActive(sessionId, phone);
        const code = this.generateCode();
        const codeHash = this.otpCryptoService.hash(code);
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);
        const otp = await this.otpRepository.create({
            session_id: sessionId,
            phone,
            code_hash: codeHash,
            expires_at: expiresAt,
        });
        return {
            otp,
            code,
        };
    }
    async verifyOtp(sessionId, phone, code) {
        const result = await this.database.transaction(async (trx) => {
            const otp = await this.otpRepository.findLatestPendingForUpdate(sessionId, phone, trx);
            if (!otp) {
                return {
                    type: "not_found",
                };
            }
            if (otp.expires_at.getTime() <= Date.now()) {
                return {
                    type: "expired",
                };
            }
            if (otp.attempts >= MAX_ATTEMPTS) {
                return {
                    type: "max_attempts",
                };
            }
            const normalizedCode = code.trim();
            if (!/^\d{6}$/.test(normalizedCode)) {
                const updatedOtp = await this.otpRepository.incrementAttempts(otp.id, trx);
                return {
                    type: "invalid",
                    attempts: updatedOtp?.attempts ?? otp.attempts + 1,
                };
            }
            const isValid = this.otpCryptoService.verify(normalizedCode, otp.code_hash);
            if (!isValid) {
                const updatedOtp = await this.otpRepository.incrementAttempts(otp.id, trx);
                return {
                    type: "invalid",
                    attempts: updatedOtp?.attempts ?? otp.attempts + 1,
                };
            }
            const consumed = await this.otpRepository.consume(otp.id, trx);
            if (!consumed) {
                return {
                    type: "not_found",
                };
            }
            return {
                type: "success",
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
    generateCode() {
        return randomInt(0, 1_000_000)
            .toString()
            .padStart(6, "0");
    }
}
