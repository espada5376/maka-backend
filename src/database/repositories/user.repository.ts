import { Knex } from "knex";
import db from "../knex.js";

export interface User {
  id: string;
  phone: string;
  phone_verified_at: Date | null;
  name: string | null;
  status: "active" | "inactive";
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  phone: string;
  name?: string | null;
}

export class UserRepository {
  constructor(private readonly database: Knex = db) {}

  async findById(id: string): Promise<User | undefined> {
    return this.database<User>("users").where({ id }).first();
  }

  async findByPhone(
    phone: string,
    database: Knex = this.database,
  ): Promise<User | undefined> {
    return database<User>("users").where({ phone }).first();
  }

  async create(
    data: CreateUserData,
    database: Knex = this.database,
  ): Promise<User> {
    const [user] = await database<User>("users")
      .insert({
        phone: data.phone,
        name: data.name ?? null,
      })
      .returning("*");

    return user;
  }

  async update(
    id: string,
    data: Partial<Pick<User, "name" | "status">>,
  ): Promise<User | undefined> {
    const [user] = await this.database<User>("users")
      .where({ id })
      .update({
        ...data,
        updated_at: this.database.fn.now(),
      })
      .returning("*");

    return user;
  }

  async markPhoneAsVerified(
    id: string,
    database: Knex = this.database,
  ): Promise<User | undefined> {
    const [user] = await database<User>("users")
      .where({ id })
      .update({
        phone_verified_at: database.fn.now(),
        updated_at: database.fn.now(),
      })
      .returning("*");

    return user;
  }
}
