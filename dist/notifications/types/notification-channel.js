import { NotificationType, } from "./notification-type.js";
const notificationChannels = {
    [NotificationType.NEW_ORDER_FOR_SELLER]: [
        "in_app",
        "whatsapp",
    ],
    [NotificationType.NEW_ORDER_FOR_BUYER]: [
        "in_app",
    ],
};
export function getNotificationChannels(type) {
    if (!Object.values(NotificationType).includes(type)) {
        throw new Error(`Unsupported notification type: ${type}`);
    }
    return notificationChannels[type];
}
