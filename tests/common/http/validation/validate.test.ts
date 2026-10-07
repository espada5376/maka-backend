import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../../src/common/http/validation/validate.js";
import { AppError } from "../../../../src/common/errors/app-error.js";
import { Errors } from "../../../../src/common/errors/errors.js";

function createMockRequest(data: unknown) {
  return {
    body: data,
    params: data,
    query: data,
  } as any;
}

function createMockResponse() {
  return {} as any;
}

describe("validateBody", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
  });

  it("should call next without error when body is valid", () => {
    const req = createMockRequest({
      name: "Ezechiel",
      age: 25,
    });

    const next = vi.fn();

    validateBody(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("should replace body with parsed data", () => {
    const schema = z.object({
      name: z.string(),
    });

    const req = createMockRequest({
      name: "Ezechiel",
      extra: "ignored",
    });

    const next = vi.fn();

    validateBody(schema)(req, createMockResponse(), next);

    expect(req.body).toEqual({
      name: "Ezechiel",
    });
  });

  it("should forward an AppError when body is invalid", () => {
    const schema = z.object({
      name: z.string(),
    });

    const req = createMockRequest({
      name: 123,
    });

    const next = vi.fn();

    validateBody(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: Errors.INVALID_REQUEST_BODY.code,
      message: Errors.INVALID_REQUEST_BODY.message,
      statusCode: Errors.INVALID_REQUEST_BODY.statusCode,
    });
  });
});

describe("validateParams", () => {
  const schema = z.object({
    id: z.string().uuid(),
  });

  it("should call next without error when params are valid", () => {
    const req = createMockRequest({
      id: "550e8400-e29b-41d4-a716-446655440000",
    });

    const next = vi.fn();

    validateParams(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("should forward an AppError when params are invalid", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    const req = createMockRequest({
      id: "invalid-id",
    });

    const next = vi.fn();

    validateParams(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: Errors.INVALID_REQUEST_PARAMS.code,
      message: Errors.INVALID_REQUEST_PARAMS.message,
      statusCode: Errors.INVALID_REQUEST_PARAMS.statusCode,
    });
  });
});

describe("validateQuery", () => {
  const schema = z.object({
    page: z.string(),
  });

  it("should call next without error when query is valid", () => {
    const req = createMockRequest({
      page: "1",
    });

    const next = vi.fn();

    validateQuery(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("should forward an AppError when query is invalid", () => {
    const schema = z.object({
      page: z.string(),
    });

    const req = createMockRequest({
      page: 123,
    });

    const next = vi.fn();

    validateQuery(schema)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();

    const error = next.mock.calls[0][0];

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: Errors.INVALID_REQUEST_QUERY.code,
      message: Errors.INVALID_REQUEST_QUERY.message,
      statusCode: Errors.INVALID_REQUEST_QUERY.statusCode,
    });
  });
});
