import { Knex } from "knex";

import db from "../knex.js";

export interface Session {
  id: string;
  user_id: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSessionData {
  user_id?: string | null;
  expires_at: Date;
}

export interface UpdateSessionData {
  expires_at?: Date;
}

export class SessionRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<Session | undefined> {
    return this.database<Session>("sessions").where({ id }).first();
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.database<Session>("sessions")
      .where({ user_id: userId })
      .orderBy("created_at", "desc");
  }

  async create(data: CreateSessionData): Promise<Session> {
    const [session] = await this.database<Session>("sessions")
      .insert({
        user_id: data.user_id ?? null,
        expires_at: data.expires_at,
      })
      .returning("*");

    return session;
  }

  async update(
    id: string,
    data: UpdateSessionData,
  ): Promise<Session | undefined> {
    const [session] = await this.database<Session>("sessions")
      .where({ id })
      .update(data)
      .returning("*");

    return session;
  }

  async delete(id: string): Promise<number> {
    return this.database<Session>("sessions").where({ id }).del();
  }
}
