import { OtpDecryptionError, } from "../services/otp-crypto.service.js";
import { WhatsAppProviderError, } from "./providers/whatsapp.provider.js";
const RETRY_DELAY_SECONDS = 60;
export class OtpDeliveryWorker {
    deliveryRepository;
    otpRepository;
    otpCryptoService;
    whatsappProvider;
    constructor(deliveryRepository, otpRepository, otpCryptoService, whatsappProvider) {
        this.deliveryRepository = deliveryRepository;
        this.otpRepository = otpRepository;
        this.otpCryptoService = otpCryptoService;
        this.whatsappProvider = whatsappProvider;
    }
    async processNext() {
        const delivery = await this.deliveryRepository.claimPending();
        if (!delivery) {
            return false;
        }
        await this.processDelivery(delivery);
        return true;
    }
    async processDelivery(delivery) {
        try {
            const otp = await this.otpRepository.findById(delivery.otp_verification_id);
            if (!otp) {
                await this.deliveryRepository.markFailed(delivery.id, {
                    error_code: "OTP_NOT_FOUND",
                    error_message: "OTP verification record not found.",
                });
                return;
            }
            if (otp.expires_at.getTime() <= Date.now()) {
                await this.deliveryRepository.markFailed(delivery.id, {
                    error_code: "OTP_EXPIRED",
                    error_message: "OTP has expired before delivery.",
                });
                return;
            }
            const code = this.otpCryptoService.decrypt(delivery.encrypted_code);
            const message = {
                to: delivery.recipient_phone,
                template: {
                    name: "verification_code",
                    language: "fr",
                    otp: code,
                },
            };
            const result = await this.whatsappProvider.send(message);
            await this.deliveryRepository.markSent(delivery.id, {
                provider_message_id: result.providerMessageId,
            });
        }
        catch (error) {
            if (error instanceof OtpDecryptionError) {
                await this.deliveryRepository.markFailed(delivery.id, {
                    error_code: "OTP_DECRYPTION_ERROR",
                    error_message: error.message,
                });
                return;
            }
            await this.handleSendFailure(delivery.id, error);
        }
    }
    async handleSendFailure(deliveryId, error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown OTP delivery error";
        if (error instanceof WhatsAppProviderError) {
            if (error.type === "permanent") {
                await this.deliveryRepository.markFailed(deliveryId, {
                    error_code: error.code ??
                        "WHATSAPP_PERMANENT_ERROR",
                    error_message: errorMessage,
                });
                return;
            }
        }
        const retry = await this.deliveryRepository.scheduleRetry(deliveryId, RETRY_DELAY_SECONDS, {
            error_code: error instanceof WhatsAppProviderError
                ? (error.code ??
                    "WHATSAPP_TEMPORARY_ERROR")
                : "OTP_DELIVERY_ERROR",
            error_message: errorMessage,
        });
        if (!retry) {
            await this.deliveryRepository.markFailed(deliveryId, {
                error_code: "MAX_ATTEMPTS_EXCEEDED",
                error_message: errorMessage,
            });
        }
    }
}
