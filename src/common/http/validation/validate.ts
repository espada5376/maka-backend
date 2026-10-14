import type { RequestHandler } from "express";
import type { ZodType } from "zod";

import { createAppError } from "../../errors/create-app-error.js";
import { Errors } from "../../errors/errors.js";

export function validateBody<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(createAppError(Errors.INVALID_REQUEST_BODY));
      return;
    }

    req.body = result.data;
    next();
  };
}

export function validateParams<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      next(createAppError(Errors.INVALID_REQUEST_PARAMS));
      return;
    }

    Object.assign(req.params, result.data);
    next();
  };
}

export function validateQuery<T>(
  schema: ZodType<T>,
): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(createAppError(Errors.INVALID_REQUEST_QUERY));
      return;
    }

    Object.assign(req.query, result.data);
    next();
  };
}
