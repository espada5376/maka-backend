import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type { CreateEventBody } from "../common/http/validation/event.schemas.js";
import type { EventService } from "../services/event.service.js";

export class EventController {
  constructor(
    private readonly eventService: EventService,
  ) {}

  async record(
    req: HttpRequest<{}, CreateEventBody>,
    res: Response,
  ): Promise<void> {
    const body = req.body;

    const context = {
      sessionId: req.session.id,
      userId: req.session.user_id,
    };

    let event;

    switch (body.name) {
      case "store.viewed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          eventKey: body.eventKey,
        });
        break;

      case "store.shared":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          eventKey: body.eventKey,
          metadata: body.metadata,
        });
        break;

      case "product.viewed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          productId: body.productId,
          eventKey: body.eventKey,
        });
        break;

      case "product.shared":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          productId: body.productId,
          eventKey: body.eventKey,
          metadata: body.metadata,
        });
        break;

      case "category.viewed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          eventKey: body.eventKey,
        });
        break;

      case "search.performed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          eventKey: body.eventKey,
          metadata: body.metadata,
        });
        break;

      case "cart.viewed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          eventKey: body.eventKey,
        });
        break;

      case "checkout.started":
      case "checkout.submitted":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          eventKey: body.eventKey,
        });
        break;

      case "checkout.validation_failed":
        event = await this.eventService.record({
          ...context,
          name: body.name,
          storeId: body.storeId,
          eventKey: body.eventKey,
          metadata: body.metadata,
        });
        break;
    }

    sendSuccess(res, 201, event);
  }
}
