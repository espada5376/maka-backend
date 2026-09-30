import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import express from "express";
import cookieParser from "cookie-parser";

import { SessionService } from "../../../src/services/session.service.js";
import type { Session } from "../../../src/database/repositories/session.repository.js";
import { createSessionMiddleware } from "../../../src/common/middlewares/session.middleware.js";

describe("sessionMiddleware", () => {
  let sessionService: {
    getValidById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  let req: Request;
  let res: Response;
  let next: NextFunction;

  const createAnonymousSession = (): Session => ({
    id: "session-new",
    user_id: null,
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  });

  beforeEach(() => {
    sessionService = {
      getValidById: vi.fn(),
      create: vi.fn(),
    };

    req = {
      cookies: {},
    } as Request;

    res = {
      cookie: vi.fn(),
    } as unknown as Response;

    next = vi.fn();
  });

  it("should reuse a valid session from the cookie", async () => {
    const session: Session = {
      id: "session-1",
      user_id: "user-1",
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    };

    req.cookies.session_id = "session-1";
    sessionService.getValidById.mockResolvedValue(session);

    const middleware = createSessionMiddleware(sessionService as unknown as SessionService);

    await middleware(req, res, next);

    expect(sessionService.getValidById).toHaveBeenCalledWith("session-1");
    expect(sessionService.create).not.toHaveBeenCalled();

    expect(req.session).toEqual({
      id: "session-1",
      user_id: "user-1",
    });

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should create an anonymous session when the cookie is absent", async () => {
    const session = createAnonymousSession();

    sessionService.create.mockResolvedValue(session);

    const middleware = createSessionMiddleware(sessionService as unknown as SessionService);

    await middleware(req, res, next);

    expect(sessionService.getValidById).not.toHaveBeenCalled();

    expect(sessionService.create).toHaveBeenCalledOnce();

    expect(req.session).toEqual({
      id: "session-new",
      user_id: null,
    });

    expect(res.cookie).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should create a new anonymous session when the cookie is invalid", async () => {
    const session = createAnonymousSession();

    req.cookies.session_id = "invalid-session";

    sessionService.getValidById.mockResolvedValue(undefined);
    sessionService.create.mockResolvedValue(session);

    const middleware = createSessionMiddleware(sessionService as unknown as SessionService);

    await middleware(req, res, next);

    expect(sessionService.getValidById).toHaveBeenCalledWith(
      "invalid-session",
    );

    expect(sessionService.create).toHaveBeenCalledOnce();

    expect(req.session).toEqual({
      id: "session-new",
      user_id: null,
    });

    expect(res.cookie).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("should create a new anonymous session when the cookie session is expired", async () => {
    const session = createAnonymousSession();

    req.cookies.session_id = "expired-session";

    sessionService.getValidById.mockResolvedValue(undefined);
    sessionService.create.mockResolvedValue(session);

    const middleware = createSessionMiddleware(sessionService as unknown as SessionService);

    await middleware(req, res, next);

    expect(sessionService.getValidById).toHaveBeenCalledWith(
      "expired-session",
    );

    expect(sessionService.create).toHaveBeenCalledOnce();

    expect(req.session).toEqual({
      id: "session-new",
      user_id: null,
    });

    expect(res.cookie).toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

it("should forward service errors to next", async () => {
  const error = new Error("database error");

  req.cookies.session_id = "session-1";

  sessionService.getValidById.mockRejectedValue(error);

  const middleware = createSessionMiddleware(
    sessionService as unknown as SessionService,
  );

  await middleware(req, res, next);

  expect(next).toHaveBeenCalledWith(error);
  expect(sessionService.create).not.toHaveBeenCalled();
});

it("should expose the session to downstream handlers", async () => {
  const session: Session = {
    id: "session-1",
    user_id: "user-1",
    created_at: new Date(),
    last_seen_at: new Date(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  };

  sessionService.getValidById.mockResolvedValue(session);

  const app = express();

  app.use(cookieParser());
  app.use(
    createSessionMiddleware(
      sessionService as unknown as SessionService,
    ),
  );

  app.get("/test-session", (req, res) => {
    res.status(200).json(req.session);
  });

  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Unable to determine test server address");
    }

    const response = await fetch(
      `http://127.0.0.1:${address.port}/test-session`,
      {
        headers: {
          Cookie: "session_id=session-1",
        },
      },
    );

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      id: "session-1",
      user_id: "user-1",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
});
