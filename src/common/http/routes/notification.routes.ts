
import { Router } from "express";

import { NotificationController } from "../../../controllers/notification.controller.js";
import { requireAuth } from "../../middlewares/require-auth.middleware.js";
import { asyncHandler } from "../../http/async-handler.js";

export function createNotificationRouter(
  notificationController: NotificationController,
): Router {
  const router = Router();

  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(notificationController.getAll.bind(notificationController)),
  );

  router.get(
    "/unread-count",
    asyncHandler(
      notificationController.getUnreadCount.bind(notificationController),
    ),
  );

  router.patch(
    "/read-all",
    asyncHandler(
      notificationController.markAllAsRead.bind(notificationController),
    ),
  );

  router.patch(
    "/:id/read",
    asyncHandler(
      notificationController.markAsRead.bind(notificationController),
    ),
  );

  return router;
}
