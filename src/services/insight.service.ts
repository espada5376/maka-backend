import {
  InsightRepository,
  type Insight,
  type CreateInsightData,
  type UpdateInsightData,
  type InsightStatus,
} from "../database/repositories/insight.repository.js";

import { Errors } from "../common/errors/errors.js";
import { createAppError } from "../common/errors/create-app-error.js";

export class InsightService {
  constructor(
    private readonly insightRepository: InsightRepository = new InsightRepository(),
  ) {}

  async getById(id: string): Promise<Insight> {
    const insight = await this.insightRepository.findById(id);

    if (!insight) {
      throw createAppError(Errors.INSIGHT_NOT_FOUND);
    }

    return insight;
  }

  async getByStoreId(storeId: string): Promise<Insight[]> {
    const normalizedStoreId = this.normalizeStoreId(storeId);

    return this.insightRepository.findByStoreId(normalizedStoreId);
  }

  async getActiveByStoreId(storeId: string): Promise<Insight[]> {
    const normalizedStoreId = this.normalizeStoreId(storeId);

    return this.insightRepository.findActiveByStoreId(normalizedStoreId);
  }

  async create(data: CreateInsightData): Promise<Insight> {
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

  async update(id: string, data: UpdateInsightData): Promise<Insight> {
    await this.getById(id);

    const normalizedData: UpdateInsightData = {};

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

  async setStatus(id: string, status: InsightStatus): Promise<Insight> {
    const normalizedStatus = this.normalizeStatus(status);

    const insight = await this.insightRepository.setStatus(
      id,
      normalizedStatus,
    );

    if (!insight) {
      throw createAppError(Errors.INSIGHT_NOT_FOUND);
    }

    return insight;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);

    const deletedCount = await this.insightRepository.delete(id);

    if (deletedCount === 0) {
      throw createAppError(Errors.INSIGHT_NOT_FOUND);
    }
  }

  private normalizeStoreId(storeId: string): string {
    if (typeof storeId !== "string") {
      throw createAppError(Errors.INVALID_STORE_ID);
    }

    const normalizedStoreId = storeId.trim();

    if (!normalizedStoreId) {
      throw createAppError(Errors.INVALID_STORE_ID);
    }

    return normalizedStoreId;
  }

  private normalizeType(type: string): string {
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

  private normalizeTitle(title: string): string {
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

  private normalizeDescription(description: string): string {
    if (typeof description !== "string") {
      throw createAppError(Errors.INVALID_DESCRIPTION);
    }

    const normalizedDescription = description.trim();

    if (!normalizedDescription) {
      throw createAppError(Errors.INVALID_DESCRIPTION);
    }

    return normalizedDescription;
  }

  private normalizeConfidence(confidence: number): number {
    if (
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw createAppError(Errors.INVALID_CONFIDENCE);
    }

    return confidence;
  }

  private validateData(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (data === undefined) {
      return {};
    }

    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw createAppError(Errors.INVALID_INSIGHT_DATA);
    }

    return data;
  }

  private normalizeStatus(status: InsightStatus): InsightStatus {
    if (status !== "active" && status !== "read" && status !== "archived") {
      throw createAppError(Errors.INVALID_STATUS);
    }

    return status;
  }
}
