import { AppError } from "./app-error.js";
import { Errors } from "./errors.js";

type ErrorDefinition = (typeof Errors)[keyof typeof Errors];

export function createAppError(error: ErrorDefinition): AppError {
  return new AppError(error.code, error.message, error.statusCode);
}
