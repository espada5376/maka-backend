import { WhatsAppProviderError, } from "./providers/whatsapp.provider.js";
const RETRY_DELAY_SECONDS = 60;
export class OtpDeliveryWorker {
    deliveryRepository;
    otpCryptoService;
    whatsappProvider;
    constructor(deliveryRepository, otpCryptoService, whatsappProvider) {
        this.deliveryRepository = deliveryRepository;
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
            const otp = this.otpCryptoService.decrypt(delivery.encrypted_code);
            const message = {
                to: delivery.recipient_phone,
                template: {
                    name: "verification_code",
                    language: "fr",
                    otp,
                },
            };
            const result = await this.whatsappProvider.send(message);
            await this.deliveryRepository.markSent(delivery.id, {
                provider_message_id: result.providerMessageId,
            });
        }
        catch (error) {
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
