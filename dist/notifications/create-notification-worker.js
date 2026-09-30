import { NotificationDeliveryRepository, } from "../database/repositories/notification-delivery.repository.js";
import { NotificationRepository, } from "../database/repositories/notification.repository.js";
import { UserRepository, } from "../database/repositories/user.repository.js";
import { NotificationWorker, } from "./notification.worker.js";
export function createNotificationWorker(whatsappProvider) {
    return new NotificationWorker(new NotificationDeliveryRepository(), new NotificationRepository(), new UserRepository(), whatsappProvider);
}
