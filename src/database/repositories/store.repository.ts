import { Knex } from "knex";
import db from "../knex.js";

export type StoreStatus = "active" | "inactive";

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  country: string;
  city: string;
  currency: string;
  status: StoreStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStoreData {
  owner_id: string;
  name: string;
  description?: string | null;
  country: string;
  city: string;
  currency: string;
}

export interface UpdateStoreData {
  name?: string;
  description?: string | null;
  country?: string;
  city?: string;
  currency?: string;
  status?: StoreStatus;
}

export class StoreRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Store | undefined> {
    return this.database<Store>("stores").where({ id }).first();
  }

  async findByOwnerId(ownerId: string): Promise<Store | undefined> {
    return this.database<Store>("stores").where({ owner_id: ownerId }).first();
  }

  async create(data: CreateStoreData): Promise<Store> {
    const [store] = await this.database<Store>("stores")
      .insert({
        owner_id: data.owner_id,
        name: data.name,
        description: data.description ?? null,
        country: data.country,
        city: data.city,
        currency: data.currency,
      })
      .returning("*");

    return store;
  }

  async update(id: string, data: UpdateStoreData): Promise<Store | undefined> {
    const [store] = await this.database<Store>("stores")
      .where({ id })
      .update({
        ...data,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return store;
  }

  async setStatus(id: string, status: StoreStatus): Promise<Store | undefined> {
    const [store] = await this.database<Store>("stores")
      .where({ id })
      .update({
        status,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return store;
  }
}
