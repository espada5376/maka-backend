import { mapNotificationToWhatsAppTemplate } from "./whatsapp-notification.mapper.js";
import { WhatsAppProviderError } from "./providers/whatsapp.provider.js";
const RETRY_DELAY_SECONDS = 60;
export class NotificationWorker {
    deliveryRepository;
    notificationRepository;
    userRepository;
    whatsappProvider;
    constructor(deliveryRepository, notificationRepository, userRepository, whatsappProvider) {
        this.deliveryRepository = deliveryRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
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
            const notification = await this.notificationRepository.findById(delivery.notification_id);
            if (!notification) {
                await this.deliveryRepository.markFailed(delivery.id, {
                    error_code: "NOTIFICATION_NOT_FOUND",
                    error_message: "Notification associated with delivery was not found.",
                });
                return;
            }
            const user = await this.userRepository.findById(notification.user_id);
            if (!user) {
                await this.deliveryRepository.markFailed(delivery.id, {
                    error_code: "USER_NOT_FOUND",
                    error_message: "User associated with notification was not found.",
                });
                return;
            }
            const message = {
                to: user.phone,
                template: mapNotificationToWhatsAppTemplate(notification),
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
            : "Unknown WhatsApp delivery error";
        if (error instanceof WhatsAppProviderError) {
            if (error.type === "permanent") {
                await this.deliveryRepository.markFailed(deliveryId, {
                    error_code: error.code ?? "WHATSAPP_PERMANENT_ERROR",
                    error_message: errorMessage,
                });
                return;
            }
        }
        const retry = await this.deliveryRepository.scheduleRetry(deliveryId, RETRY_DELAY_SECONDS, {
            error_code: error instanceof WhatsAppProviderError
                ? (error.code ?? "WHATSAPP_TEMPORARY_ERROR")
                : "WHATSAPP_SEND_ERROR",
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
