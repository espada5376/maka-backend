import {
  GenukaWhatsAppProvider,
} from "../providers/genuka-whatsapp.provider.js";
import type {
  WhatsAppProvider,
} from "../providers/whatsapp.provider.js";
import {
  getGenukaWhatsAppConfig,
} from "../config/genuka.config.js";

export function createWhatsAppProvider():
  | WhatsAppProvider
  | undefined {
  const config = getGenukaWhatsAppConfig();

  if (!config) {
    return undefined;
  }

  return new GenukaWhatsAppProvider(config);
}
