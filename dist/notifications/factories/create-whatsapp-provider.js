import { GenukaWhatsAppProvider, } from "../providers/genuka-whatsapp.provider.js";
import { getGenukaWhatsAppConfig, } from "../config/genuka.config.js";
export function createWhatsAppProvider() {
    const config = getGenukaWhatsAppConfig();
    if (!config) {
        return undefined;
    }
    return new GenukaWhatsAppProvider(config);
}
