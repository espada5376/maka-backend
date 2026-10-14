import type { Request, Response, NextFunction } from "express";

import { SessionService } from "../../services/session.service.js";
import type { Session } from "../../database/repositories/session.repository.js";

const SESSION_COOKIE_NAME = "session_id";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export interface RequestSession {
  id: string;
  user_id: string | null;
}

declare global {
  namespace Express {
    interface Request {
      session: RequestSession;
    }
  }
}

export function createSessionMiddleware(
  sessionService: SessionService,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

      if (sessionId) {
        const session = await sessionService.getValidById(sessionId);

        if (session) {
          req.session = toRequestSession(session);

          next();
          return;
        }
      }

      const session = await sessionService.create({
        user_id: null,
        expires_at: new Date(Date.now() + SESSION_DURATION_MS),
      });

      req.session = toRequestSession(session);

      res.cookie(SESSION_COOKIE_NAME, session.id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_DURATION_MS,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

function toRequestSession(session: Session): RequestSession {
  return {
    id: session.id,
    user_id: session.user_id,
  };
}
