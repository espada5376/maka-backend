import { describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

import { requireAuth } from "../../../src/common/middlewares/require-auth.middleware.js";

describe("requireAuth", () => {
  function createRequest(userId: string | null) {
    return {
      session: {
        id: "test-session-id",
        user_id: userId,
      },
    } as unknown as Request;
  }

  it("allows the request when the user is authenticated", () => {
    const req = createRequest("test-user-id");
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects the request when the session is anonymous", () => {
    const req = createRequest(null);
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "USER_UNAUTHORIZED",
        statusCode: 401,
      }),
    );
  });
});
