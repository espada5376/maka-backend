import { describe, expect, it, vi } from "vitest";

import { InsightService } from "../../src/services/insight.service.js";

import type {
  Insight,
  InsightRepository,
} from "../../src/database/repositories/insight.repository.js";

const createInsight = (overrides: Partial<Insight> = {}): Insight => ({
  id: "insight-1",
  store_id: "store-1",
  type: "low_conversion",
  title: "Faible conversion",
  description: "Ce produit reçoit beaucoup de vues mais peu de commandes.",
  confidence: "0.8500",
  data: {
    product_id: "product-1",
    views: 100,
    orders: 3,
  },
  status: "active",
  created_at: new Date("2026-01-01T10:00:00.000Z"),
  ...overrides,
});

const createRepositoryMock = () =>
  ({
    findById: vi.fn(),
    findByStoreId: vi.fn(),
    findActiveByStoreId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    delete: vi.fn(),
  }) as unknown as InsightRepository;

describe("InsightService", () => {
  describe("getById", () => {
    it("returns the insight when it exists", async () => {
      const repository = createRepositoryMock();
      const insight = createInsight();

      vi.mocked(repository.findById).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await expect(service.getById("insight-1")).resolves.toEqual(insight);

      expect(repository.findById).toHaveBeenCalledWith("insight-1");
    });

    it("throws INSIGHT_NOT_FOUND when the insight does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new InsightService(repository);

      await expect(service.getById("insight-1")).rejects.toMatchObject({
        code: "INSIGHT_NOT_FOUND",
      });
    });
  });

  describe("getByStoreId", () => {
    it("returns all insights of a store", async () => {
      const repository = createRepositoryMock();

      const insights = [
        createInsight(),
        createInsight({
          id: "insight-2",
        }),
      ];

      vi.mocked(repository.findByStoreId).mockResolvedValue(insights);

      const service = new InsightService(repository);

      await expect(service.getByStoreId("store-1")).resolves.toEqual(insights);

      expect(repository.findByStoreId).toHaveBeenCalledWith("store-1");
    });

    it("trims the store id before calling the repository", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findByStoreId).mockResolvedValue([]);

      const service = new InsightService(repository);

      await service.getByStoreId("  store-1  ");

      expect(repository.findByStoreId).toHaveBeenCalledWith("store-1");
    });

    it("throws INVALID_STORE_ID when the store id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(service.getByStoreId("   ")).rejects.toMatchObject({
        code: "INVALID_STORE_ID",
      });

      expect(repository.findByStoreId).not.toHaveBeenCalled();
    });
  });

  describe("getActiveByStoreId", () => {
    it("returns active insights of a store", async () => {
      const repository = createRepositoryMock();

      const insights = [
        createInsight(),
        createInsight({
          id: "insight-2",
        }),
      ];

      vi.mocked(repository.findActiveByStoreId).mockResolvedValue(insights);

      const service = new InsightService(repository);

      await expect(service.getActiveByStoreId("store-1")).resolves.toEqual(
        insights,
      );

      expect(repository.findActiveByStoreId).toHaveBeenCalledWith("store-1");
    });

    it("throws INVALID_STORE_ID when the store id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(service.getActiveByStoreId("   ")).rejects.toMatchObject({
        code: "INVALID_STORE_ID",
      });

      expect(repository.findActiveByStoreId).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("creates an insight with normalized data", async () => {
      const repository = createRepositoryMock();

      const insight = createInsight();

      vi.mocked(repository.create).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: " store-1 ",
          type: " low_conversion ",
          title: " Faible conversion ",
          description:
            " Ce produit reçoit beaucoup de vues mais peu de commandes. ",
          confidence: 0.85,
          data: {
            product_id: "product-1",
            views: 100,
            orders: 3,
          },
        }),
      ).resolves.toEqual(insight);

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description:
          "Ce produit reçoit beaucoup de vues mais peu de commandes.",
        confidence: 0.85,
        data: {
          product_id: "product-1",
          views: 100,
          orders: 3,
        },
        status: "active",
      });
    });

    it("uses an empty object when data is omitted", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createInsight({
          data: {},
        }),
      );

      const service = new InsightService(repository);

      await service.create({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
      });

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
        data: {},
        status: "active",
      });
    });

    it("preserves an explicitly provided status", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createInsight({
          status: "read",
        }),
      );

      const service = new InsightService(repository);

      await service.create({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
        status: "read",
      });

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
        data: {},
        status: "read",
      });
    });

    it("throws INVALID_STORE_ID when store id is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "   ",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STORE_ID",
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("throws INVALID_TYPE when type is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "   ",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TYPE",
      });
    });

    it("throws INVALID_TYPE when type exceeds 50 characters", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "a".repeat(51),
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TYPE",
      });
    });

    it("accepts a type of exactly 50 characters", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createInsight({
          type: "a".repeat(50),
        }),
      );

      const service = new InsightService(repository);

      await service.create({
        store_id: "store-1",
        type: "a".repeat(50),
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
      });

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "a".repeat(50),
        title: "Faible conversion",
        description: "Description",
        confidence: 0.5,
        data: {},
        status: "active",
      });
    });

    it("throws INVALID_TITLE when title is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "   ",
          description: "Description",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TITLE",
      });
    });

    it("throws INVALID_TITLE when title exceeds 150 characters", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "a".repeat(151),
          description: "Description",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TITLE",
      });
    });

    it("throws INVALID_DESCRIPTION when description is empty", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "   ",
          confidence: 0.5,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DESCRIPTION",
      });
    });

    it("throws INVALID_CONFIDENCE when confidence is below 0", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: -0.01,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CONFIDENCE",
      });
    });

    it("throws INVALID_CONFIDENCE when confidence is above 1", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 1.01,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CONFIDENCE",
      });
    });

    it("accepts confidence equal to 0", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createInsight({
          confidence: "0.0000",
        }),
      );

      const service = new InsightService(repository);

      await service.create({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0,
      });

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 0,
        data: {},
        status: "active",
      });
    });

    it("accepts confidence equal to 1", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.create).mockResolvedValue(
        createInsight({
          confidence: "1.0000",
        }),
      );

      const service = new InsightService(repository);

      await service.create({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 1,
      });

      expect(repository.create).toHaveBeenCalledWith({
        store_id: "store-1",
        type: "low_conversion",
        title: "Faible conversion",
        description: "Description",
        confidence: 1,
        data: {},
        status: "active",
      });
    });

    it("throws INVALID_CONFIDENCE when confidence is NaN", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: Number.NaN,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CONFIDENCE",
      });
    });

    it("throws INVALID_CONFIDENCE when confidence is not finite", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: Number.POSITIVE_INFINITY,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CONFIDENCE",
      });
    });

    it("throws INVALID_DATA when data is null", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
          data: null as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });
    });

    it("throws INVALID_DATA when data is an array", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
          data: [] as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });
    });

    it("throws INVALID_DATA when data is a primitive value", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
          data: "invalid" as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });
    });

    it("throws INVALID_STATUS when status is invalid", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.create({
          store_id: "store-1",
          type: "low_conversion",
          title: "Faible conversion",
          description: "Description",
          confidence: 0.5,
          status: "invalid" as never,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STATUS",
      });
    });
  });

  describe("update", () => {
    it("updates the provided fields", async () => {
      const repository = createRepositoryMock();

      const insight = createInsight({
        title: "Nouvelle analyse",
        confidence: "0.9000",
      });

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      vi.mocked(repository.update).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          title: " Nouvelle analyse ",
          confidence: 0.9,
        }),
      ).resolves.toEqual(insight);

      expect(repository.update).toHaveBeenCalledWith("insight-1", {
        title: "Nouvelle analyse",
        confidence: 0.9,
      });
    });

    it("updates all supported fields", async () => {
      const repository = createRepositoryMock();

      const insight = createInsight();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      vi.mocked(repository.update).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await service.update("insight-1", {
        type: " new_type ",
        title: " New title ",
        description: " New description ",
        confidence: 0.75,
        data: {
          product_id: "product-2",
        },
        status: "read",
      });

      expect(repository.update).toHaveBeenCalledWith("insight-1", {
        type: "new_type",
        title: "New title",
        description: "New description",
        confidence: 0.75,
        data: {
          product_id: "product-2",
        },
        status: "read",
      });
    });

    it("throws INSIGHT_NOT_FOUND when the insight does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          title: "New title",
        }),
      ).rejects.toMatchObject({
        code: "INSIGHT_NOT_FOUND",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_TYPE when updating with an empty type", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          type: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TYPE",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_TITLE when updating with an empty title", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          title: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_TITLE",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_DESCRIPTION when updating with an empty description", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          description: "   ",
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DESCRIPTION",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_CONFIDENCE when updating with an invalid confidence", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          confidence: 2,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_CONFIDENCE",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_DATA when updating with invalid data", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          data: [] as unknown as Record<string, unknown>,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_DATA",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("throws INVALID_STATUS when updating with an invalid status", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      const service = new InsightService(repository);

      await expect(
        service.update("insight-1", {
          status: "invalid" as never,
        }),
      ).rejects.toMatchObject({
        code: "INVALID_STATUS",
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it("accepts an empty update object", async () => {
      const repository = createRepositoryMock();

      const insight = createInsight();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      vi.mocked(repository.update).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await expect(service.update("insight-1", {})).resolves.toEqual(insight);

      expect(repository.update).toHaveBeenCalledWith("insight-1", {});
    });
  });

  describe("setStatus", () => {
    it("changes the status of an insight", async () => {
      const repository = createRepositoryMock();

      const insight = createInsight({
        status: "read",
      });

      vi.mocked(repository.setStatus).mockResolvedValue(insight);

      const service = new InsightService(repository);

      await expect(service.setStatus("insight-1", "read")).resolves.toEqual(
        insight,
      );

      expect(repository.setStatus).toHaveBeenCalledWith("insight-1", "read");
    });

    it("throws INVALID_STATUS when the status is invalid", async () => {
      const repository = createRepositoryMock();

      const service = new InsightService(repository);

      await expect(
        service.setStatus("insight-1", "invalid" as never),
      ).rejects.toMatchObject({
        code: "INVALID_STATUS",
      });

      expect(repository.setStatus).not.toHaveBeenCalled();
    });

    it("throws INSIGHT_NOT_FOUND when the insight does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.setStatus).mockResolvedValue(undefined);

      const service = new InsightService(repository);

      await expect(
        service.setStatus("insight-1", "read"),
      ).rejects.toMatchObject({
        code: "INSIGHT_NOT_FOUND",
      });
    });
  });

  describe("delete", () => {
    it("deletes an existing insight", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      vi.mocked(repository.delete).mockResolvedValue(1);

      const service = new InsightService(repository);

      await expect(service.delete("insight-1")).resolves.toBeUndefined();

      expect(repository.findById).toHaveBeenCalledWith("insight-1");
      expect(repository.delete).toHaveBeenCalledWith("insight-1");
    });

    it("throws INSIGHT_NOT_FOUND when the insight does not exist", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(undefined);

      const service = new InsightService(repository);

      await expect(service.delete("insight-1")).rejects.toMatchObject({
        code: "INSIGHT_NOT_FOUND",
      });

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it("throws INSIGHT_NOT_FOUND when the insight disappears before deletion", async () => {
      const repository = createRepositoryMock();

      vi.mocked(repository.findById).mockResolvedValue(createInsight());

      vi.mocked(repository.delete).mockResolvedValue(0);

      const service = new InsightService(repository);

      await expect(service.delete("insight-1")).rejects.toMatchObject({
        code: "INSIGHT_NOT_FOUND",
      });

      expect(repository.delete).toHaveBeenCalledWith("insight-1");
    });
  });
});
