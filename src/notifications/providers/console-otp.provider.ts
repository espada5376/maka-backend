import { randomUUID } from "node:crypto";

import {
  WhatsAppProviderError,
} from "./whatsapp.provider.js";

import type {
  WhatsAppMessage,
  WhatsAppProvider,
  WhatsAppSendResult,
} from "./whatsapp.provider.js";

export class ConsoleOtpProvider implements WhatsAppProvider {
  async send(
    message: WhatsAppMessage,
  ): Promise<WhatsAppSendResult> {
    if (message.template.name !== "verification_code") {
      throw new WhatsAppProviderError(
        "Console OTP provider only supports verification codes.",
        "permanent",
        "UNSUPPORTED_TEMPLATE",
      );
    }

    const maskedPhone = message.to.replace(
      /^(\+\d{2,3})\d+(\d{2})$/,
      "$1******$2",
    );

    console.info("\n========== DEVELOPMENT OTP ==========");
    console.info(`Destinataire : ${maskedPhone}`);
    console.info(`Code OTP     : ${message.template.otp}`);
    console.info("======================================\n");

    return {
      providerMessageId: `console-${randomUUID()}`,
    };
  }
}
