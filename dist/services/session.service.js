import { SessionRepository, } from "../database/repositories/session.repository.js";
import { createAppError } from "../common/errors/create-app-error.js";
import { Errors } from "../common/errors/errors.js";
export class SessionService {
    sessionRepository;
    constructor(sessionRepository = new SessionRepository()) {
        this.sessionRepository = sessionRepository;
    }
    async getById(id) {
        const session = await this.sessionRepository.findById(id);
        if (!session) {
            throw createAppError(Errors.SESSION_NOT_FOUND);
        }
        return session;
    }
    async getValidById(id) {
        const session = await this.sessionRepository.findById(id);
        if (!session) {
            return undefined;
        }
        if (session.expires_at.getTime() <= Date.now()) {
            return undefined;
        }
        return session;
    }
    async getByUserId(userId) {
        return this.sessionRepository.findByUserId(userId);
    }
    async create(data) {
        this.validateExpiration(data.expires_at);
        return this.sessionRepository.create({
            user_id: data.user_id ?? null,
            expires_at: data.expires_at,
        });
    }
    async isValid(id) {
        const session = await this.sessionRepository.findById(id);
        if (!session) {
            return false;
        }
        return session.expires_at.getTime() > Date.now();
    }
    async updateExpiration(id, expiresAt) {
        this.validateExpiration(expiresAt);
        await this.getById(id);
        const session = await this.sessionRepository.update(id, {
            expires_at: expiresAt,
        });
        if (!session) {
            throw createAppError(Errors.SESSION_NOT_FOUND);
        }
        return session;
    }
    async delete(id) {
        await this.getById(id);
        const deletedCount = await this.sessionRepository.delete(id);
        if (deletedCount === 0) {
            throw createAppError(Errors.SESSION_NOT_FOUND);
        }
    }
    validateExpiration(expiresAt) {
        if (!(expiresAt instanceof Date) ||
            Number.isNaN(expiresAt.getTime()) ||
            expiresAt.getTime() <= Date.now()) {
            throw createAppError(Errors.INVALID_SESSION_EXPIRATION);
        }
    }
}
