import { describe, expect, it, vi } from "vitest";

import { validateIdempotencyKey } from "../../../src/common/middlewares/idempotency-key.middleware.js";
import { AppError } from "../../../src/common/errors/app-error.js";
import { Errors } from "../../../src/common/errors/errors.js";

describe("validateIdempotencyKey", () => {
  function executeMiddleware(key: string | undefined) {
    const req = {
      get: vi.fn().mockReturnValue(key),
    };
    const next = vi.fn();

    validateIdempotencyKey(
      req as never,
      {} as never,
      next,
    );

    return { req, next };
  }

  it("rejects a missing Idempotency-Key header", () => {
    const { next } = executeMiddleware(undefined);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: Errors.IDEMPOTENCY_KEY_REQUIRED.code,
      statusCode: 400,
    });
  });

  it("rejects an empty Idempotency-Key header", () => {
    const { next } = executeMiddleware("   ");

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it("rejects a key longer than 100 characters", () => {
    const { next } = executeMiddleware("a".repeat(101));

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
  });

  it("accepts a valid key of up to 100 characters", () => {
    const { next } = executeMiddleware("a".repeat(100));

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });
});
