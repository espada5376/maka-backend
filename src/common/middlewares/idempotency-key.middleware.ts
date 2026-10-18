import type { RequestHandler } from "express";

import { createAppError } from "../errors/create-app-error.js";
import { Errors } from "../errors/errors.js";

const MAX_IDEMPOTENCY_KEY_LENGTH = 100;

export const validateIdempotencyKey: RequestHandler = (
  req,
  _res,
  next,
) => {
  const key = req.get("Idempotency-Key");

  if (
    !key ||
    key.trim().length === 0 ||
    key.length > MAX_IDEMPOTENCY_KEY_LENGTH
  ) {
    next(createAppError(Errors.IDEMPOTENCY_KEY_REQUIRED));
    return;
  }

  next();
};
