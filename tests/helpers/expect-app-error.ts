import type { Errors } from "../../src/common/errors/errors.js";

type ErrorDefinition = (typeof Errors)[keyof typeof Errors];

export function expectAppError(error: ErrorDefinition) {
  return {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
  };
}
