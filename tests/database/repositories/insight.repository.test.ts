import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  InsightRepository,
} from "../../../src/database/repositories/insight.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import {
  StoreRepository,
} from "../../../src/database/repositories/store.repository";

import { cleanDatabase } from "../../helpers/database";

describe("InsightRepository", () => {
  const insightRepository =
    new InsightRepository(db);

  const userRepository =
    new UserRepository(db);

  const storeRepository =
    new StoreRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createStore(
    suffix = "",
  ) {
    const user = await userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name: "Insight Owner",
    });

    return storeRepository.create({
      owner_id: user.id,
      name: `Ma Boutique${suffix}`,
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });
  }

  async function createInsight(
    storeId: string,
    overrides: Partial<{
      type: string;
      title: string;
      description: string;
      confidence: number;
      data: Record<string, unknown>;
      status:
        | "active"
        | "read"
        | "archived";
    }> = {},
  ) {
    return insightRepository.create({
      store_id: storeId,
      type:
        overrides.type ??
        "low_stock",
      title:
        overrides.title ??
        "Stock faible",
      description:
        overrides.description ??
        "Le stock de ce produit est faible.",
      confidence:
        overrides.confidence ?? 0.85,
      data:
        overrides.data ?? {
          product_id: "product-1",
          current_stock: 2,
        },
      status:
        overrides.status ?? "active",
    });
  }

  it("should create an insight", async () => {
    const store = await createStore();

    const insight =
      await insightRepository.create({
        store_id: store.id,
        type: "low_stock",
        title: "Stock faible",
        description:
          "Le stock d'un produit est faible.",
        confidence: 0.85,
      });

    expect(insight).toBeDefined();
    expect(insight.id).toBeDefined();
    expect(insight.store_id).toBe(store.id);
    expect(insight.type).toBe("low_stock");
    expect(insight.title).toBe("Stock faible");
    expect(insight.description).toBe(
      "Le stock d'un produit est faible.",
    );
    expect(insight.confidence).toBe("0.8500");
    expect(insight.status).toBe("active");
  });

  it("should use an empty object as default data", async () => {
    const store = await createStore();

    const insight =
      await insightRepository.create({
        store_id: store.id,
        type: "sales_trend",
        title: "Tendance",
        description: "Tendance détectée.",
        confidence: 0.5,
      });

    expect(insight.data).toEqual({});
  });

  it("should preserve insight data", async () => {
    const store = await createStore();

    const data = {
      product_id: "abc",
      current_stock: 3,
      recommended_quantity: 10,
      reason: "strong_sales",
    };

    const insight =
      await insightRepository.create({
        store_id: store.id,
        type: "restock",
        title: "Réapprovisionnement recommandé",
        description:
          "Un réapprovisionnement est recommandé.",
        confidence: 0.92,
        data,
      });

    expect(insight.data).toEqual(data);
  });

  it("should create an insight with a custom status", async () => {
    const store = await createStore();

    const insight =
      await insightRepository.create({
        store_id: store.id,
        type: "sales_trend",
        title: "Tendance",
        description: "Tendance détectée.",
        confidence: 0.7,
        status: "read",
      });

    expect(insight.status).toBe("read");
  });

  it("should reject an insight for a nonexistent store", async () => {
    await expect(
      insightRepository.create({
        store_id:
          "00000000-0000-0000-0000-000000000000",
        type: "low_stock",
        title: "Stock faible",
        description: "Description",
        confidence: 0.8,
      }),
    ).rejects.toThrow();
  });

  it("should find an insight by id", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const insight =
      await insightRepository.findById(
        created.id,
      );

    expect(insight).toBeDefined();
    expect(insight?.id).toBe(created.id);
  });

  it("should return undefined for an unknown id", async () => {
    const insight =
      await insightRepository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(insight).toBeUndefined();
  });

  it("should find insights by store id", async () => {
    const store = await createStore();

    await createInsight(store.id);
    await createInsight(store.id, {
      type: "sales_trend",
    });

    const insights =
      await insightRepository.findByStoreId(
        store.id,
      );

    expect(insights).toHaveLength(2);
  });

  it("should not return insights from another store", async () => {
    const storeA = await createStore(" A");
    const storeB = await createStore(" B");

    await createInsight(storeA.id);

    const insights =
      await insightRepository.findByStoreId(
        storeB.id,
      );

    expect(insights).toHaveLength(0);
  });

  it("should order store insights by newest first", async () => {
    const store = await createStore();

    const first = await createInsight(
      store.id,
      {
        title: "Premier insight",
      },
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 10),
    );

    const second = await createInsight(
      store.id,
      {
        title: "Deuxième insight",
      },
    );

    const insights =
      await insightRepository.findByStoreId(
        store.id,
      );

    expect(insights[0].id).toBe(second.id);
    expect(insights[1].id).toBe(first.id);
  });

  it("should find only active insights", async () => {
    const store = await createStore();

    await createInsight(store.id, {
      status: "active",
    });

    await createInsight(store.id, {
      status: "read",
    });

    await createInsight(store.id, {
      status: "archived",
    });

    const insights =
      await insightRepository.findActiveByStoreId(
        store.id,
      );

    expect(insights).toHaveLength(1);
    expect(insights[0].status).toBe("active");
  });

  it("should return an empty array when no active insight exists", async () => {
    const store = await createStore();

    await createInsight(store.id, {
      status: "read",
    });

    const insights =
      await insightRepository.findActiveByStoreId(
        store.id,
      );

    expect(insights).toHaveLength(0);
  });

  it("should update an insight", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const updated =
      await insightRepository.update(
        created.id,
        {
          title: "Nouveau titre",
          description: "Nouvelle description",
          confidence: 0.95,
        },
      );

    expect(updated).toBeDefined();
    expect(updated?.title).toBe(
      "Nouveau titre",
    );
    expect(updated?.description).toBe(
      "Nouvelle description",
    );
    expect(updated?.confidence).toBe("0.9500");
  });

  it("should update insight data", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const data = {
      source: "analytics",
      score: 95,
    };

    const updated =
      await insightRepository.update(
        created.id,
        { data },
      );

    expect(updated?.data).toEqual(data);
  });

  it("should update an insight status", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const updated =
      await insightRepository.update(
        created.id,
        {
          status: "read",
        },
      );

    expect(updated?.status).toBe("read");
  });

  it("should return undefined when updating an unknown insight", async () => {
    const updated =
      await insightRepository.update(
        "00000000-0000-0000-0000-000000000000",
        {
          title: "Test",
        },
      );

    expect(updated).toBeUndefined();
  });

  it("should set an insight status", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const updated =
      await insightRepository.setStatus(
        created.id,
        "archived",
      );

    expect(updated?.status).toBe("archived");
  });

  it("should return undefined when setting status of an unknown insight", async () => {
    const updated =
      await insightRepository.setStatus(
        "00000000-0000-0000-0000-000000000000",
        "archived",
      );

    expect(updated).toBeUndefined();
  });

  it("should delete an insight", async () => {
    const store = await createStore();

    const created = await createInsight(
      store.id,
    );

    const deleted =
      await insightRepository.delete(
        created.id,
      );

    expect(deleted).toBe(1);

    const insight =
      await insightRepository.findById(
        created.id,
      );

    expect(insight).toBeUndefined();
  });

  it("should return zero when deleting an unknown insight", async () => {
    const deleted =
      await insightRepository.delete(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(deleted).toBe(0);
  });

  it("should reject a negative confidence", async () => {
    const store = await createStore();

    await expect(
      createInsight(store.id, {
        confidence: -0.1,
      }),
    ).rejects.toThrow();
  });

  it("should reject a confidence greater than one", async () => {
    const store = await createStore();

    await expect(
      createInsight(store.id, {
        confidence: 1.1,
      }),
    ).rejects.toThrow();
  });

  it("should allow confidence equal to zero", async () => {
    const store = await createStore();

    const insight = await createInsight(
      store.id,
      {
        confidence: 0,
      },
    );

    expect(insight.confidence).toBe(
      "0.0000",
    );
  });

  it("should allow confidence equal to one", async () => {
    const store = await createStore();

    const insight = await createInsight(
      store.id,
      {
        confidence: 1,
      },
    );

    expect(insight.confidence).toBe(
      "1.0000",
    );
  });

  it("should reject an invalid insight status", async () => {
    const store = await createStore();

    await expect(
      db("insights").insert({
        store_id: store.id,
        type: "test",
        title: "Test",
        description: "Description",
        confidence: 0.5,
        status: "invalid",
      }),
    ).rejects.toThrow();
  });

  it("should reject deleting a store before deleting its insights", async () => {
    const store = await createStore();

    await createInsight(store.id);

    await expect(
      db("stores")
        .where({ id: store.id })
        .del(),
    ).rejects.toThrow();
  });
});
