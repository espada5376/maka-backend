import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  CreateStoreBody,
  StoreIdParams,
  StoreOwnerIdParams,
  UpdateStoreBody,
} from "../common/http/validation/store.schemas.js";
import { StoreService } from "../services/store.service.js";

export class StoreController {
  constructor(
    private readonly storeService: StoreService,
  ) {}

    async getMe(
    req: HttpRequest,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.getByOwnerId(
      req.session.user_id!,
    );

    sendSuccess(res, 200, store);
  }


  async create(
    req: HttpRequest<{}, CreateStoreBody>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.create(
      req.session.id,
      req.body,
    );

    sendSuccess(res, 201, store);
  }

  async getById(
    req: HttpRequest<StoreIdParams>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.getById(
      req.params.id,
    );

    sendSuccess(res, 200, store);
  }

  async getByOwnerId(
    req: HttpRequest<StoreOwnerIdParams>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.getByOwnerId(
      req.params.ownerId,
    );

    sendSuccess(res, 200, store);
  }

  async update(
    req: HttpRequest<StoreIdParams, UpdateStoreBody>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.update(
      req.session.id,
      req.params.id,
      req.body,
    );

    sendSuccess(res, 200, store);
  }

  async activate(
    req: HttpRequest<StoreIdParams>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.activate(
      req.session.id,
      req.params.id,
    );

    sendSuccess(res, 200, store);
  }

  async deactivate(
    req: HttpRequest<StoreIdParams>,
    res: Response,
  ): Promise<void> {
    const store = await this.storeService.deactivate(
      req.session.id,
      req.params.id,
    );

    sendSuccess(res, 200, store);
  }
}
