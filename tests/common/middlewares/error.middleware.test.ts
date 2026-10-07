import { describe, expect, it, vi } from "vitest";

import { errorMiddleware } from "../../../src/common/middlewares/error.middleware.js";
import { AppError } from "../../../src/common/errors/app-error.js";
import { Errors } from "../../../src/common/errors/errors.js";
import { createAppError } from "../../../src/common/errors/create-app-error.js";

describe("errorMiddleware", () => {
  function createResponseMock() {
    const json = vi.fn();

    const status = vi.fn(() => ({
      json,
    }));

    return {
      response: {
        status,
      },
      status,
      json,
    };
  }

  it("sends an AppError as an HTTP response", () => {
    const { response, status, json } = createResponseMock();

    const error = new AppError(
      Errors.CART_NOT_FOUND.code,
      Errors.CART_NOT_FOUND.message,
      Errors.CART_NOT_FOUND.statusCode,
    );

    errorMiddleware(error, {} as never, response as never, vi.fn());

    expect(status).toHaveBeenCalledWith(Errors.CART_NOT_FOUND.statusCode);

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: Errors.CART_NOT_FOUND.code,
        message: Errors.CART_NOT_FOUND.message,
      },
    });
  });

  it("sends a generic 500 response for unknown errors", () => {
    const { response, status, json } = createResponseMock();

    const error = new Error("Database connection failed");

    errorMiddleware(error, {} as never, response as never, vi.fn());

    expect(status).toHaveBeenCalledWith(500);

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  });

  it("logs unexpected server errors", () => {
    const { response } = createResponseMock();

    const error = new Error("Database connection failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    errorMiddleware(error, {} as never, response as never, vi.fn());

    expect(consoleError).toHaveBeenCalledWith(error);

    consoleError.mockRestore();
  });

  it("does not log AppError responses", () => {
    const { response } = createResponseMock();

    const error = createAppError(Errors.CART_NOT_FOUND);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    errorMiddleware(error, {} as never, response as never, vi.fn());

    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
