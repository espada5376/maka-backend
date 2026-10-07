import multer from "multer";

import { AppError } from "../errors/app-error.js";
import { CartServiceError } from "../../services/cart.service.js";
import { SessionServiceError } from "../../services/session.service.js";

export interface HttpErrorResponse {
  statusCode: number;
  body: {
    success: false;
    error: {
      code: string;
      message: string;
    };
  };
}

export function mapErrorToHttpResponse(
  error: unknown,
): HttpErrorResponse {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  if (error instanceof multer.MulterError) {
    return mapMulterError(error);
  }

  if (error instanceof SessionServiceError) {
    return mapSessionServiceError(error);
  }

  if (error instanceof CartServiceError) {
    return mapCartServiceError(error);
  }

  return {
    statusCode: 500,
    body: {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    },
  };
}

function mapMulterError(
  error: multer.MulterError,
): HttpErrorResponse {
  if (error.code === "LIMIT_FILE_SIZE") {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "Image file exceeds the maximum size of 5 MB",
        },
      },
    };
  }

  return {
    statusCode: 400,
    body: {
      success: false,
      error: {
        code: "INVALID_IMAGE_UPLOAD",
        message: error.message,
      },
    },
  };
}

function mapSessionServiceError(
  error: SessionServiceError,
): HttpErrorResponse {
  switch (error.code) {
    case "SESSION_NOT_FOUND":
      return {
        statusCode: 404,
        body: {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
      };

    case "INVALID_EXPIRATION":
      return {
        statusCode: 400,
        body: {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
      };

    default:
      return {
        statusCode: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          },
        },
      };
  }
}

function mapCartServiceError(
  error: CartServiceError,
): HttpErrorResponse {
  /*
   * CartServiceError currently owns its own error codes.
   * We deliberately keep the mapping here rather than coupling
   * the service directly to Express.
   */
  return {
    statusCode: 400,
    body: {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    },
  };
}
