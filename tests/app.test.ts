import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { UserController } from "../src/controllers/user.controller.js";

import { createApp } from "../src/app.js";
import type { Session } from "../src/database/repositories/session.repository.js";
import { SessionService } from "../src/services/session.service.js";

describe("app", () => {
  it("should reuse a valid session", async () => {
    const session: Session = {
      id: "session-1",
      user_id: "user-1",
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    };

    const sessionService = {
      getValidById: vi.fn().mockResolvedValue(session),
      create: vi.fn(),
    } as unknown as SessionService;

    const app = createApp(sessionService);

    app.get("/test-session", (req: Request, res: Response) => {
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

      expect(sessionService.getValidById).toHaveBeenCalledWith("session-1");

      expect(sessionService.create).not.toHaveBeenCalled();
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

  it("should mount the user routes", async () => {
    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: "session-1",
        user_id: null,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }),
    } as unknown as SessionService;

    const userController = {
      getById: vi.fn((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            id: req.params.id,
          },
        });
      }),
      create: vi.fn(),
      update: vi.fn(),
      markPhoneAsVerified: vi.fn(),
    } as unknown as UserController;

    const app = createApp(sessionService, userController);

    const server = app.listen(0);

    try {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Unable to determine test server address");
      }

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/users/user-1`,
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        success: true,
        data: {
          id: "user-1",
        },
      });

      expect(userController.getById).toHaveBeenCalledOnce();
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

  it("should create an anonymous session when no session cookie exists", async () => {
    const session: Session = {
      id: "session-new",
      user_id: null,
      created_at: new Date(),
      last_seen_at: new Date(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    };

    const sessionService = {
      getValidById: vi.fn(),
      create: vi.fn().mockResolvedValue(session),
    } as unknown as SessionService;

    const app = createApp(sessionService);

    app.get("/test-session", (req: Request, res: Response) => {
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
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        id: "session-new",
        user_id: null,
      });

      expect(sessionService.getValidById).not.toHaveBeenCalled();
      expect(sessionService.create).toHaveBeenCalledOnce();

      const setCookie = response.headers.get("set-cookie");

      expect(setCookie).toContain("session_id=session-new");
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
