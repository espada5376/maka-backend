import { createOtpDeliveryWorker, } from "./create-otp-delivery-worker.js";
import { OtpDeliveryWorkerRunner, } from "./otp-delivery-worker.runner.js";
import { createWhatsAppProvider, } from "./factories/create-whatsapp-provider.js";
export function createOtpDeliveryWorkerRunner() {
    const whatsappProvider = createWhatsAppProvider();
    if (!whatsappProvider) {
        console.log("OTP delivery worker disabled: Genuka WhatsApp is not configured.");
        return undefined;
    }
    return new OtpDeliveryWorkerRunner(createOtpDeliveryWorker(whatsappProvider));
}
