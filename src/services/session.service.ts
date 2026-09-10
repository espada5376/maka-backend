
import {
  SessionRepository,
  type Session,
  type CreateSessionData,
} from "../database/repositories/session.repository.js";

export enum SessionErrorCode {
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  INVALID_EXPIRATION = "INVALID_EXPIRATION",
}

export class SessionServiceError extends Error {
  constructor(
    public readonly code: SessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SessionServiceError";
  }
}

export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository =
      new SessionRepository(),
  ) {}

  async getById(id: string): Promise<Session> {
    const session = await this.sessionRepository.findById(id);

    if (!session) {
      throw new SessionServiceError(
        SessionErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${id}`,
      );
    }

    return session;
  }

  async getByUserId(userId: string): Promise<Session[]> {
    return this.sessionRepository.findByUserId(userId);
  }

  async create(data: CreateSessionData): Promise<Session> {
    this.validateExpiration(data.expires_at);

    return this.sessionRepository.create({
      user_id: data.user_id ?? null,
      expires_at: data.expires_at,
    });
  }

  async isValid(id: string): Promise<boolean> {
    const session = await this.sessionRepository.findById(id);

    if (!session) {
      return false;
    }

    return session.expires_at.getTime() > Date.now();
  }

  async updateExpiration(
    id: string,
    expiresAt: Date,
  ): Promise<Session> {
    this.validateExpiration(expiresAt);

    await this.getById(id);

    const session = await this.sessionRepository.update(id, {
      expires_at: expiresAt,
    });

    if (!session) {
      throw new SessionServiceError(
        SessionErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${id}`,
      );
    }

    return session;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    const deletedCount = await this.sessionRepository.delete(id);

    if (deletedCount === 0) {
      throw new SessionServiceError(
        SessionErrorCode.SESSION_NOT_FOUND,
        `Session not found: ${id}`,
      );
    }
  }

  private validateExpiration(expiresAt: Date): void {
    if (
      !(expiresAt instanceof Date) ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new SessionServiceError(
        SessionErrorCode.INVALID_EXPIRATION,
        "Session expiration must be a valid future date",
      );
    }
  }
}

