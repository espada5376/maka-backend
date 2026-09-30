import { createNotificationWorker, } from "./create-notification-worker.js";
import { NotificationWorkerRunner, } from "./notification-worker.runner.js";
import { createWhatsAppProvider, } from "./factories/create-whatsapp-provider.js";
export function createNotificationWorkerRunner() {
    const whatsappProvider = createWhatsAppProvider();
    if (!whatsappProvider) {
        console.log("WhatsApp notification worker disabled: Genuka WhatsApp is not configured.");
        return undefined;
    }
    return new NotificationWorkerRunner(createNotificationWorker(whatsappProvider));
}
