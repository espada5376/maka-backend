import {
  NotificationDeliveryRepository,
} from "../database/repositories/notification-delivery.repository.js";
import {
  NotificationRepository,
} from "../database/repositories/notification.repository.js";
import {
  UserRepository,
} from "../database/repositories/user.repository.js";
import {
  NotificationWorker,
} from "./notification.worker.js";
import type {
  WhatsAppProvider,
} from "./providers/whatsapp.provider.js";

export function createNotificationWorker(
  whatsappProvider: WhatsAppProvider,
): NotificationWorker {
  return new NotificationWorker(
    new NotificationDeliveryRepository(),
    new NotificationRepository(),
    new UserRepository(),
    whatsappProvider,
  );
}
