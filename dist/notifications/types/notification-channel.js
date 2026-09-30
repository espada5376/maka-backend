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
    return (notificationChannels[type] ?? ["in_app"]);
}
