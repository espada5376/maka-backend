import {
  OtpDeliveryRepository,
} from "../database/repositories/otp-delivery.repository.js";
import {
  OtpRepository,
} from "../database/repositories/otp.repository.js";
import {
  OtpCryptoService,
} from "../services/otp-crypto.service.js";
import {
  OtpDeliveryWorker,
} from "./otp-delivery.worker.js";
import type {
  WhatsAppProvider,
} from "./providers/whatsapp.provider.js";

export function createOtpDeliveryWorker(
  whatsappProvider: WhatsAppProvider,
): OtpDeliveryWorker {
  return new OtpDeliveryWorker(
    new OtpDeliveryRepository(),
    new OtpRepository(),
    new OtpCryptoService(),
    whatsappProvider,
  );
}
