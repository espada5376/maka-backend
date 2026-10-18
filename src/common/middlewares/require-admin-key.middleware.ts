
import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

import { createAppError } from "../errors/create-app-error.js";
import { Errors } from "../errors/errors.js";

const ADMIN_KEY_HEADER = "x-admin-api-key";

export function requireAdminKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const configuredKey = process.env.ADMIN_API_KEY;
  const providedKey = req.get(ADMIN_KEY_HEADER);

  if (!configuredKey || !providedKey) {
    next(createAppError(Errors.ADMIN_UNAUTHORIZED));
    return;
  }

  const expected = Buffer.from(configuredKey, "utf8");
  const provided = Buffer.from(providedKey, "utf8");

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    next(createAppError(Errors.ADMIN_UNAUTHORIZED));
    return;
  }

  next();
}
