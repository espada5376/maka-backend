import {
  GenukaWhatsAppProvider,
} from "../providers/genuka-whatsapp.provider.js";

import {
  ConsoleOtpProvider,
} from "../providers/console-otp.provider.js";

import type {
  WhatsAppProvider,
} from "../providers/whatsapp.provider.js";

import {
  getGenukaWhatsAppConfig,
} from "../config/genuka.config.js";

export function createWhatsAppProvider():
  | WhatsAppProvider
  | undefined {
  if (process.env.NODE_ENV === "development") {
    console.info(
      "OTP delivery mode: development console.",
    );

    return new ConsoleOtpProvider();
  }

  const config = getGenukaWhatsAppConfig();

  if (!config) {
    return undefined;
  }

  return new GenukaWhatsAppProvider(config);
}
