import type { Request, Response, NextFunction } from "express";

import { mapErrorToHttpResponse } from "../http/error-response.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const response = mapErrorToHttpResponse(error);

  if (response.statusCode >= 500) {
    console.error(error);
  }

  res.status(response.statusCode).json(response.body);
}
