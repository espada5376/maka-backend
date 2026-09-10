
import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  SessionService,
  SessionServiceError,
  SessionErrorCode,
} from "../../src/services/session.service.js";

describe("SessionService", () => {
  const sessionRepository = {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const sessionService = new SessionService(sessionRepository as any);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("should return the session when it exists", async () => {
      const session = {
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2030-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      };

      sessionRepository.findById.mockResolvedValue(session);

      await expect(sessionService.getById("session-1")).resolves.toEqual(
        session,
      );

      expect(sessionRepository.findById).toHaveBeenCalledWith("session-1");
    });

    it("should throw when the session does not exist", async () => {
      sessionRepository.findById.mockResolvedValue(undefined);

      await expect(sessionService.getById("unknown")).rejects.toMatchObject({
        code: SessionErrorCode.SESSION_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      sessionRepository.findById.mockRejectedValue(error);

      await expect(sessionService.getById("session-1")).rejects.toThrow(error);
    });
  });

  describe("getByUserId", () => {
    it("should return the user's sessions", async () => {
      const sessions = [
        {
          id: "session-1",
          user_id: "user-1",
          expires_at: new Date("2030-01-01T00:00:00Z"),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      sessionRepository.findByUserId.mockResolvedValue(sessions);

      await expect(
        sessionService.getByUserId("user-1"),
      ).resolves.toEqual(sessions);

      expect(sessionRepository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("should return an empty array when the user has no sessions", async () => {
      sessionRepository.findByUserId.mockResolvedValue([]);

      await expect(sessionService.getByUserId("user-1")).resolves.toEqual([]);

      expect(sessionRepository.findByUserId).toHaveBeenCalledWith("user-1");
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      sessionRepository.findByUserId.mockRejectedValue(error);

      await expect(sessionService.getByUserId("user-1")).rejects.toThrow(error);
    });
  });

  describe("create", () => {
    it("should create an authenticated session", async () => {
      const expiresAt = new Date("2030-01-01T00:00:00Z");

      const session = {
        id: "session-1",
        user_id: "user-1",
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      sessionRepository.create.mockResolvedValue(session);

      await expect(
        sessionService.create({
          user_id: "user-1",
          expires_at: expiresAt,
        }),
      ).resolves.toEqual(session);

      expect(sessionRepository.create).toHaveBeenCalledWith({
        user_id: "user-1",
        expires_at: expiresAt,
      });
    });

    it("should create an anonymous session", async () => {
      const expiresAt = new Date("2030-01-01T00:00:00Z");

      const session = {
        id: "session-1",
        user_id: null,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };

      sessionRepository.create.mockResolvedValue(session);

      await expect(
        sessionService.create({
          expires_at: expiresAt,
        }),
      ).resolves.toEqual(session);

      expect(sessionRepository.create).toHaveBeenCalledWith({
        user_id: null,
        expires_at: expiresAt,
      });
    });

    it("should reject an invalid expiration date", async () => {
      await expect(
        sessionService.create({
          user_id: "user-1",
          expires_at: new Date("invalid"),
        }),
      ).rejects.toMatchObject({
        code: SessionErrorCode.INVALID_EXPIRATION,
      });

      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it("should reject a session that is already expired", async () => {
      const expiresAt = new Date(Date.now() - 1000);

      await expect(
        sessionService.create({
          user_id: "user-1",
          expires_at: expiresAt,
        }),
      ).rejects.toMatchObject({
        code: SessionErrorCode.INVALID_EXPIRATION,
      });

      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      const expiresAt = new Date("2030-01-01T00:00:00Z");
      const error = new Error("database error");

      sessionRepository.create.mockRejectedValue(error);

      await expect(
        sessionService.create({
          user_id: "user-1",
          expires_at: expiresAt,
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("isValid", () => {
    it("should return true when the session exists and is not expired", async () => {
      const session = {
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date(Date.now() + 60_000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      sessionRepository.findById.mockResolvedValue(session);

      await expect(sessionService.isValid("session-1")).resolves.toBe(true);
    });

    it("should return false when the session does not exist", async () => {
      sessionRepository.findById.mockResolvedValue(undefined);

      await expect(sessionService.isValid("unknown")).resolves.toBe(false);
    });

    it("should return false when the session is expired", async () => {
      const session = {
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date(Date.now() - 1000),
        created_at: new Date(),
        updated_at: new Date(),
      };

      sessionRepository.findById.mockResolvedValue(session);

      await expect(sessionService.isValid("session-1")).resolves.toBe(false);
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      sessionRepository.findById.mockRejectedValue(error);

      await expect(sessionService.isValid("session-1")).rejects.toThrow(error);
    });
  });

  describe("updateExpiration", () => {
    it("should update the session expiration", async () => {
      const expiresAt = new Date("2030-01-01T00:00:00Z");

      const existingSession = {
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2029-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedSession = {
        ...existingSession,
        expires_at: expiresAt,
      };

      sessionRepository.findById.mockResolvedValue(existingSession);
      sessionRepository.update.mockResolvedValue(updatedSession);

      await expect(
        sessionService.updateExpiration("session-1", expiresAt),
      ).resolves.toEqual(updatedSession);

      expect(sessionRepository.update).toHaveBeenCalledWith("session-1", {
        expires_at: expiresAt,
      });
    });

    it("should reject an invalid expiration date", async () => {
      await expect(
        sessionService.updateExpiration(
          "session-1",
          new Date("invalid"),
        ),
      ).rejects.toMatchObject({
        code: SessionErrorCode.INVALID_EXPIRATION,
      });

      expect(sessionRepository.findById).not.toHaveBeenCalled();
      expect(sessionRepository.update).not.toHaveBeenCalled();
    });

    it("should reject an already expired expiration date", async () => {
      await expect(
        sessionService.updateExpiration(
          "session-1",
          new Date(Date.now() - 1000),
        ),
      ).rejects.toMatchObject({
        code: SessionErrorCode.INVALID_EXPIRATION,
      });

      expect(sessionRepository.findById).not.toHaveBeenCalled();
      expect(sessionRepository.update).not.toHaveBeenCalled();
    });

    it("should throw when the session does not exist", async () => {
      sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        sessionService.updateExpiration(
          "session-1",
          new Date("2030-01-01T00:00:00Z"),
        ),
      ).rejects.toMatchObject({
        code: SessionErrorCode.SESSION_NOT_FOUND,
      });

      expect(sessionRepository.update).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      sessionRepository.findById.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2029-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      });

      sessionRepository.update.mockRejectedValue(error);

      await expect(
        sessionService.updateExpiration(
          "session-1",
          new Date("2030-01-01T00:00:00Z"),
        ),
      ).rejects.toThrow(error);
    });
  });

  describe("delete", () => {
    it("should delete an existing session", async () => {
      sessionRepository.findById.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2030-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      });

      sessionRepository.delete.mockResolvedValue(1);

      await expect(sessionService.delete("session-1")).resolves.toBeUndefined();

      expect(sessionRepository.delete).toHaveBeenCalledWith("session-1");
    });

    it("should throw when the session does not exist", async () => {
      sessionRepository.findById.mockResolvedValue(undefined);

      await expect(
        sessionService.delete("unknown"),
      ).rejects.toMatchObject({
        code: SessionErrorCode.SESSION_NOT_FOUND,
      });

      expect(sessionRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw when the repository deletes nothing", async () => {
      sessionRepository.findById.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2030-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      });

      sessionRepository.delete.mockResolvedValue(0);

      await expect(
        sessionService.delete("session-1"),
      ).rejects.toMatchObject({
        code: SessionErrorCode.SESSION_NOT_FOUND,
      });
    });

    it("should propagate repository errors", async () => {
      const error = new Error("database error");

      sessionRepository.findById.mockResolvedValue({
        id: "session-1",
        user_id: "user-1",
        expires_at: new Date("2030-01-01T00:00:00Z"),
        created_at: new Date(),
        updated_at: new Date(),
      });

      sessionRepository.delete.mockRejectedValue(error);

      await expect(sessionService.delete("session-1")).rejects.toThrow(error);
    });
  });

  describe("SessionServiceError", () => {
    it("should expose a SessionServiceError-compatible error type", () => {
      const error = new SessionServiceError(
        SessionErrorCode.SESSION_NOT_FOUND,
        "Session not found",
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SessionServiceError);
      expect(error.code).toBe(SessionErrorCode.SESSION_NOT_FOUND);
      expect(error.name).toBe("SessionServiceError");
    });
  });
});

