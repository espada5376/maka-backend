import type { Request, Response, NextFunction } from "express";

import { createAppError } from "../errors/create-app-error.js";
import { Errors } from "../errors/errors.js";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.session.user_id) {
    return next(createAppError(Errors.USER_UNAUTHORIZED));
  }

  next();
}
