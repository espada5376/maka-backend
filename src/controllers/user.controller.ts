import type { Request, Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import { UserService } from "../services/user.service.js";

export class UserController {
  constructor(private readonly userService: UserService = new UserService()) {}

  async getById(req: Request, res: Response): Promise<void> {
    const user = await this.userService.getById(req.params.id);

    sendSuccess(res, 200, user);
  }

  async update(req: Request, res: Response): Promise<void> {
    const user = await this.userService.update(req.params.id, req.body);

    sendSuccess(res, 200, user);
  }
}
