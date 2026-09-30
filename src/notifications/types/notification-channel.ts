import {
  NotificationType,
} from "./notification-type.js";

export type NotificationChannel =
  | "in_app"
  | "whatsapp";

const notificationChannels: Partial<
  Record<NotificationType, readonly NotificationChannel[]>
> = {
  [NotificationType.NEW_ORDER_FOR_SELLER]: [
    "in_app",
    "whatsapp",
  ],

  [NotificationType.NEW_ORDER_FOR_BUYER]: [
    "in_app",
  ],
};

export function getNotificationChannels(
  type: string,
): readonly NotificationChannel[] {
  return (
    notificationChannels[
      type as NotificationType
    ] ?? ["in_app"]
  );
}
