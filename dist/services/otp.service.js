import { randomInt } from "node:crypto";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
const OTP_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
export class OtpService {
    otpRepository;
    database;
    otpCryptoService;
    otpDeliveryRepository;
    userRepository;
    sessionRepository;
    phoneService;
    constructor(otpRepository, database, otpCryptoService, otpDeliveryRepository, userRepository, sessionRepository, phoneService) {
        this.otpRepository = otpRepository;
        this.database = database;
        this.otpCryptoService = otpCryptoService;
        this.otpDeliveryRepository = otpDeliveryRepository;
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.phoneService = phoneService;
    }
    async requestOtp(sessionId, phone) {
        const normalizedPhone = this.phoneService.normalize(phone);
        return this.database.transaction(async (trx) => {
            await this.otpRepository.invalidateActive(sessionId, normalizedPhone, trx);
            const code = this.generateCode();
            const codeHash = this.otpCryptoService.hash(code);
            const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS);
            const otp = await this.otpRepository.create({
                session_id: sessionId,
                phone: normalizedPhone,
                code_hash: codeHash,
                expires_at: expiresAt,
            }, trx);
            await this.otpDeliveryRepository.create({
                otp_verification_id: otp.id,
                recipient_phone: normalizedPhone,
                encrypted_code: this.otpCryptoService.encrypt(code),
            }, trx);
            return otp;
        });
    }
    async verifyOtp(sessionId, phone, code) {
        const normalizedPhone = this.phoneService.normalize(phone);
        const result = await this.database.transaction(async (trx) => {
            const otp = await this.otpRepository.findLatestPendingForUpdate(sessionId, normalizedPhone, trx);
            if (!otp) {
                return { type: "not_found" };
            }
            if (otp.expires_at.getTime() <= Date.now()) {
                return { type: "expired" };
            }
            if (otp.attempts >= MAX_ATTEMPTS) {
                return { type: "max_attempts" };
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
            let user = await this.userRepository.findByPhone(otp.phone, trx);
            if (!user) {
                user = await this.userRepository.create({
                    phone: otp.phone,
                    name: null,
                }, trx);
            }
            const verifiedUser = await this.userRepository.markPhoneAsVerified(user.id, trx);
            if (!verifiedUser) {
                throw new Error("Failed to verify user phone");
            }
            const updatedSession = await this.sessionRepository.update(sessionId, {
                user_id: user.id,
            }, trx);
            if (!updatedSession) {
                throw createAppError(Errors.SESSION_NOT_FOUND);
            }
            const consumed = await this.otpRepository.consume(otp.id, trx);
            if (!consumed) {
                return { type: "not_found" };
            }
            return {
                type: "success",
                user: verifiedUser,
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
        return result;
    }
    generateCode() {
        return randomInt(0, 1_000_000).toString().padStart(6, "0");
    }
}
