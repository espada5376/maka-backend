
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

import { requireAdminKey } from "../../../src/common/middlewares/require-admin-key.middleware.js";

describe("requireAdminKey", () => {
  const originalAdminKey = process.env.ADMIN_API_KEY;

  afterEach(() => {
    if (originalAdminKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = originalAdminKey;
    }

    vi.restoreAllMocks();
  });

  function createRequest(providedKey?: string) {
    return {
      get: vi.fn((header: string) => {
        if (header.toLowerCase() !== "x-admin-api-key") {
          return undefined;
        }

        return providedKey;
      }),
    } as unknown as Request;
  }

  it("allows the request when the key is valid", () => {
    process.env.ADMIN_API_KEY = "test-admin-secret";

    const req = createRequest("test-admin-secret");
    const next = vi.fn() as unknown as NextFunction;

    requireAdminKey(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects the request when the key is missing", () => {
    process.env.ADMIN_API_KEY = "test-admin-secret";

    const req = createRequest();
    const next = vi.fn() as unknown as NextFunction;

    requireAdminKey(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ADMIN_UNAUTHORIZED",
        statusCode: 403,
      }),
    );
  });

  it("rejects the request when the key is incorrect", () => {
    process.env.ADMIN_API_KEY = "test-admin-secret";

    const req = createRequest("wrong-secret");
    const next = vi.fn() as unknown as NextFunction;

    requireAdminKey(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ADMIN_UNAUTHORIZED",
        statusCode: 403,
      }),
    );
  });

  it("rejects the request when the server key is not configured", () => {
    delete process.env.ADMIN_API_KEY;

    const req = createRequest("test-admin-secret");
    const next = vi.fn() as unknown as NextFunction;

    requireAdminKey(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "ADMIN_UNAUTHORIZED",
        statusCode: 403,
      }),
    );
  });
});
