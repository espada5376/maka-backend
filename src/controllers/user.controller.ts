import type { Request, Response, NextFunction } from "express";

import { UserService } from "../services/user.service.js";

export class UserController {
  constructor(
    private readonly userService: UserService = new UserService(),
  ) {}

  async getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await this.userService.getById(
        req.params.id,
      );

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await this.userService.create(
        req.body,
      );

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = await this.userService.update(
        req.params.id,
        req.body,
      );

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async markPhoneAsVerified(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user =
        await this.userService.markPhoneAsVerified(
          req.params.id,
        );

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}
