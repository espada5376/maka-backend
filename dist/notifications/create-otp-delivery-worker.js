import { OtpDeliveryRepository, } from "../database/repositories/otp-delivery.repository.js";
import { OtpRepository, } from "../database/repositories/otp.repository.js";
import { OtpCryptoService, } from "../services/otp-crypto.service.js";
import { OtpDeliveryWorker, } from "./otp-delivery.worker.js";
export function createOtpDeliveryWorker(whatsappProvider) {
    return new OtpDeliveryWorker(new OtpDeliveryRepository(), new OtpRepository(), new OtpCryptoService(), whatsappProvider);
}
