import { InsightRepository, } from "../database/repositories/insight.repository.js";
import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";
export class InsightService {
    insightRepository;
    constructor(insightRepository = new InsightRepository()) {
        this.insightRepository = insightRepository;
    }
    async getById(id) {
        const insight = await this.insightRepository.findById(id);
        if (!insight) {
            throw createAppError(Errors.INSIGHT_NOT_FOUND);
        }
        return insight;
    }
    async getByStoreId(storeId) {
        const normalizedStoreId = this.normalizeStoreId(storeId);
        return this.insightRepository.findByStoreId(normalizedStoreId);
    }
    async getActiveByStoreId(storeId) {
        const normalizedStoreId = this.normalizeStoreId(storeId);
        return this.insightRepository.findActiveByStoreId(normalizedStoreId);
    }
    async create(data) {
        const storeId = this.normalizeStoreId(data.store_id);
        const type = this.normalizeType(data.type);
        const title = this.normalizeTitle(data.title);
        const description = this.normalizeDescription(data.description);
        const confidence = this.normalizeConfidence(data.confidence);
        const insightData = this.validateData(data.data);
        const status = this.normalizeStatus(data.status ?? "active");
        return this.insightRepository.create({
            store_id: storeId,
            type,
            title,
            description,
            confidence,
            data: insightData,
            status,
        });
    }
    async update(id, data) {
        await this.getById(id);
        const normalizedData = {};
        if (data.type !== undefined) {
            normalizedData.type = this.normalizeType(data.type);
        }
        if (data.title !== undefined) {
            normalizedData.title = this.normalizeTitle(data.title);
        }
        if (data.description !== undefined) {
            normalizedData.description = this.normalizeDescription(data.description);
        }
        if (data.confidence !== undefined) {
            normalizedData.confidence = this.normalizeConfidence(data.confidence);
        }
        if (data.data !== undefined) {
            normalizedData.data = this.validateData(data.data);
        }
        if (data.status !== undefined) {
            normalizedData.status = this.normalizeStatus(data.status);
        }
        const insight = await this.insightRepository.update(id, normalizedData);
        if (!insight) {
            throw createAppError(Errors.INSIGHT_NOT_FOUND);
        }
        return insight;
    }
    async setStatus(id, status) {
        const normalizedStatus = this.normalizeStatus(status);
        const insight = await this.insightRepository.setStatus(id, normalizedStatus);
        if (!insight) {
            throw createAppError(Errors.INSIGHT_NOT_FOUND);
        }
        return insight;
    }
    async delete(id) {
        await this.getById(id);
        const deletedCount = await this.insightRepository.delete(id);
        if (deletedCount === 0) {
            throw createAppError(Errors.INSIGHT_NOT_FOUND);
        }
    }
    normalizeStoreId(storeId) {
        if (typeof storeId !== "string") {
            throw createAppError(Errors.INVALID_STORE_ID);
        }
        const normalizedStoreId = storeId.trim();
        if (!normalizedStoreId) {
            throw createAppError(Errors.INVALID_STORE_ID);
        }
        return normalizedStoreId;
    }
    normalizeType(type) {
        if (typeof type !== "string") {
            throw createAppError(Errors.INVALID_INSIGHT_TYPE);
        }
        const normalizedType = type.trim();
        if (!normalizedType) {
            throw createAppError(Errors.INVALID_INSIGHT_TYPE);
        }
        if (normalizedType.length > 50) {
            throw createAppError(Errors.INVALID_INSIGHT_TYPE);
        }
        return normalizedType;
    }
    normalizeTitle(title) {
        if (typeof title !== "string") {
            throw createAppError(Errors.INVALID_INSIGHT_TITLE);
        }
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
            throw createAppError(Errors.INVALID_INSIGHT_TITLE);
        }
        if (normalizedTitle.length > 150) {
            throw createAppError(Errors.INVALID_INSIGHT_TITLE);
        }
        return normalizedTitle;
    }
    normalizeDescription(description) {
        if (typeof description !== "string") {
            throw createAppError(Errors.INVALID_DESCRIPTION);
        }
        const normalizedDescription = description.trim();
        if (!normalizedDescription) {
            throw createAppError(Errors.INVALID_DESCRIPTION);
        }
        return normalizedDescription;
    }
    normalizeConfidence(confidence) {
        if (typeof confidence !== "number" ||
            !Number.isFinite(confidence) ||
            confidence < 0 ||
            confidence > 1) {
            throw createAppError(Errors.INVALID_CONFIDENCE);
        }
        return confidence;
    }
    validateData(data) {
        if (data === undefined) {
            return {};
        }
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
            throw createAppError(Errors.INVALID_INSIGHT_DATA);
        }
        return data;
    }
    normalizeStatus(status) {
        if (status !== "active" && status !== "read" && status !== "archived") {
            throw createAppError(Errors.INVALID_STATUS);
        }
        return status;
    }
}
