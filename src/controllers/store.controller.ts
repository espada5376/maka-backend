import type { Request, Response, NextFunction } from "express";

import { StoreService } from "../services/store.service.js";

export class StoreController {
  constructor(
    private readonly storeService: StoreService = new StoreService(),
  ) {}

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await this.storeService.create(req.session.id, req.body);

      res.status(201).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const store = await this.storeService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByOwnerId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const store = await this.storeService.getByOwnerId(req.params.ownerId);

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const store = await this.storeService.update(
        req.session.id,
        req.params.id,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async activate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const store = await this.storeService.activate(
        req.session.id,
        req.params.id,
      );

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const store = await this.storeService.deactivate(
        req.session.id,
        req.params.id,
      );

      res.status(200).json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }
}
