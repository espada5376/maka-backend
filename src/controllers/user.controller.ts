import type { Response } from "express";

import { sendSuccess } from "../common/http/response.js";
import type { HttpRequest } from "../common/http/request.js";
import type {
  UpdateUserBody,
  UserIdParams,
} from "../common/http/validation/user.schemas.js";
import { UserService } from "../services/user.service.js";

export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  async getById(
    req: HttpRequest<UserIdParams>,
    res: Response,
  ): Promise<void> {
    const user = await this.userService.getById(req.params.id);

    sendSuccess(res, 200, user);
  }
  
  async updateMe(
  req: HttpRequest<unknown, UpdateUserBody>,
  res: Response,
): Promise<void> {
  const userId = req.session.user_id!;

  const user = await this.userService.update(
    userId,
    req.body,
  );

  sendSuccess(res, 200, user);
}

  async getMe(
  req: HttpRequest,
  res: Response,
): Promise<void> {
  const userId = req.session.user_id!;

  const user = await this.userService.getById(userId);

  sendSuccess(res, 200, user);
}

  async update(
    req: HttpRequest<UserIdParams, UpdateUserBody>,
    res: Response,
  ): Promise<void> {
    const user = await this.userService.update(
      req.params.id,
      req.body,
    );

    sendSuccess(res, 200, user);
  }
}
