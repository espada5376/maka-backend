import { Knex } from "knex";

import db from "../knex.js";

export type InsightStatus = "active" | "read" | "archived";

export interface Insight {
  id: string;
  store_id: string;
  type: string;
  title: string;
  description: string;
  confidence: string;
  data: Record<string, unknown>;
  status: InsightStatus;
  created_at: Date;
}

export interface CreateInsightData {
  store_id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
  status?: InsightStatus;
}

export interface UpdateInsightData {
  type?: string;
  title?: string;
  description?: string;
  confidence?: number;
  data?: Record<string, unknown>;
  status?: InsightStatus;
}

export class InsightRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Insight | undefined> {
    return this.database<Insight>("insights").where({ id }).first();
  }

  async findByStoreId(storeId: string): Promise<Insight[]> {
    return this.database<Insight>("insights")
      .where({ store_id: storeId })
      .orderBy("created_at", "desc");
  }

  async findActiveByStoreId(storeId: string): Promise<Insight[]> {
    return this.database<Insight>("insights")
      .where({
        store_id: storeId,
        status: "active",
      })
      .orderBy("created_at", "desc");
  }

  async create(data: CreateInsightData): Promise<Insight> {
    const [insight] = await this.database<Insight>("insights")
      .insert({
        store_id: data.store_id,
        type: data.type,
        title: data.title,
        description: data.description,
        confidence: data.confidence,
        data: data.data ?? {},
        status: data.status ?? "active",
      })
      .returning("*");

    return insight;
  }

  async update(
    id: string,
    data: UpdateInsightData,
  ): Promise<Insight | undefined> {
    const [insight] = await this.database<Insight>("insights")
      .where({ id })
      .update(data)
      .returning("*");

    return insight;
  }

  async setStatus(
    id: string,
    status: InsightStatus,
  ): Promise<Insight | undefined> {
    const [insight] = await this.database<Insight>("insights")
      .where({ id })
      .update({ status })
      .returning("*");

    return insight;
  }

  async delete(id: string): Promise<number> {
    return this.database<Insight>("insights").where({ id }).del();
  }
}
