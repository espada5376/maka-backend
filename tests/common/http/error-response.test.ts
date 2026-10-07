import { describe, expect, it } from "vitest";
import multer from "multer";

import { mapErrorToHttpResponse } from "../../../src/common/http/error-response.js";
import { AppError } from "../../../src/common/errors/app-error.js";
import { Errors } from "../../../src/common/errors/errors.js";

describe("mapErrorToHttpResponse", () => {
  it("maps an AppError to an HTTP error response", () => {
    const error = new AppError(
      Errors.CART_NOT_FOUND.code,
      Errors.CART_NOT_FOUND.message,
      Errors.CART_NOT_FOUND.statusCode,
    );

    const response = mapErrorToHttpResponse(error);

    expect(response).toEqual({
      statusCode: Errors.CART_NOT_FOUND.statusCode,
      body: {
        success: false,
        error: {
          code: Errors.CART_NOT_FOUND.code,
          message: Errors.CART_NOT_FOUND.message,
        },
      },
    });
  });

  it("maps Multer file size errors", () => {
    const error = new multer.MulterError("LIMIT_FILE_SIZE");

    const response = mapErrorToHttpResponse(error);

    expect(response).toEqual({
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "Image file exceeds the maximum size of 5 MB",
        },
      },
    });
  });

  it("maps other Multer errors", () => {
    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE");

    const response = mapErrorToHttpResponse(error);

    expect(response).toEqual({
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_IMAGE_UPLOAD",
          message: error.message,
        },
      },
    });
  });

  it("maps unknown errors to an internal server error", () => {
    const error = new Error("Database connection failed");

    const response = mapErrorToHttpResponse(error);

    expect(response).toEqual({
      statusCode: 500,
      body: {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Internal server error",
        },
      },
    });
  });
});
