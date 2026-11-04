
import { Router } from "express";

import { asyncHandler } from "../../http/async-handler.js";
import { validateBody } from "../../http/validation/validate.js";
import { createEventSchema } from "../../http/validation/event.schemas.js";
import { EventController } from "../../../controllers/event.controller.js";

export function createEventRouter(
  eventController: EventController,
): Router {
  const router = Router();

  router.post(
    "/",
    validateBody(createEventSchema),
    asyncHandler(eventController.record.bind(eventController)),
  );

  return router;
}
