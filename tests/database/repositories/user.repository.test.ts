import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { cleanDatabase } from "../../helpers/database";
import db from "../../../src/database/knex";
import { UserRepository } from "../../../src/database/repositories/user.repository";

describe("UserRepository", () => {
  const repository = new UserRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it("should create a user", async () => {
    const user = await repository.create({
      phone: "90000001",
      name: "Test User",
    });

    expect(user).toBeDefined();
    expect(user.phone).toBe("90000001");
    expect(user.name).toBe("Test User");
    expect(user.status).toBe("active");
    expect(user.phone_verified_at).toBeNull();
  });

  it("should find a user by id", async () => {
    const created = await repository.create({
      phone: "90000002",
      name: "Find By ID",
    });

    const user = await repository.findById(created.id);

    expect(user).toBeDefined();
    expect(user?.id).toBe(created.id);
    expect(user?.phone).toBe("90000002");
  });

  it("should find a user by phone", async () => {
    await repository.create({
      phone: "90000003",
      name: "Find By Phone",
    });

    const user = await repository.findByPhone("90000003");

    expect(user).toBeDefined();
    expect(user?.phone).toBe("90000003");
  });

  it("should mark the phone as verified", async () => {
    const created = await repository.create({
      phone: "90000004",
      name: "Verification Test",
    });

    expect(created.phone_verified_at).toBeNull();

    const updated = await repository.markPhoneAsVerified(created.id);

    expect(updated).toBeDefined();
    expect(updated?.phone_verified_at).not.toBeNull();
  });

  it("should update the user", async () => {
    const created = await repository.create({
      phone: "90000005",
      name: "Old Name",
    });

    const updated = await repository.update(created.id, {
      name: "New Name",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("New Name");
  });

  it("should reject duplicate phone numbers", async () => {
    await repository.create({
      phone: "90000006",
      name: "First User",
    });

    await expect(
      repository.create({
        phone: "90000006",
        name: "Second User",
      }),
    ).rejects.toThrow();
  });
});
