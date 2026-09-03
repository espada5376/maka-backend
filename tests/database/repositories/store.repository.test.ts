import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { cleanDatabase } from "../../helpers/database";
import db from "../../../src/database/knex";
import {
  StoreRepository,
} from "../../../src/database/repositories/store.repository";
import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

describe("StoreRepository", () => {
  const storeRepository = new StoreRepository(db);
  const userRepository = new UserRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createTestUser() {
    return userRepository.create({
      phone: `9${Date.now()}${Math.floor(Math.random() * 1000)}`,
      name: "Store Owner",
    });
  }

  it("should create a store", async () => {
    const user = await createTestUser();

    const store = await storeRepository.create({
      owner_id: user.id,
      name: "Ma Boutique",
      description: "Une boutique de test",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    expect(store).toBeDefined();
    expect(store.owner_id).toBe(user.id);
    expect(store.name).toBe("Ma Boutique");
    expect(store.description).toBe("Une boutique de test");
    expect(store.country).toBe("TG");
    expect(store.city).toBe("Lomé");
    expect(store.currency).toBe("XOF");
    expect(store.status).toBe("active");
  });

  it("should find a store by id", async () => {
    const user = await createTestUser();

    const created = await storeRepository.create({
      owner_id: user.id,
      name: "Boutique Test",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const store = await storeRepository.findById(created.id);

    expect(store).toBeDefined();
    expect(store?.id).toBe(created.id);
  });

  it("should find a store by owner id", async () => {
    const user = await createTestUser();

    const created = await storeRepository.create({
      owner_id: user.id,
      name: "Boutique Owner",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const store = await storeRepository.findByOwnerId(user.id);

    expect(store).toBeDefined();
    expect(store?.id).toBe(created.id);
    expect(store?.owner_id).toBe(user.id);
  });

  it("should update a store", async () => {
    const user = await createTestUser();

    const created = await storeRepository.create({
      owner_id: user.id,
      name: "Ancien Nom",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const updated = await storeRepository.update(created.id, {
      name: "Nouveau Nom",
      description: "Nouvelle description",
    });

    expect(updated).toBeDefined();
    expect(updated?.name).toBe("Nouveau Nom");
    expect(updated?.description).toBe("Nouvelle description");
  });

  it("should change the store status", async () => {
    const user = await createTestUser();

    const created = await storeRepository.create({
      owner_id: user.id,
      name: "Boutique Status",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    const updated = await storeRepository.setStatus(
      created.id,
      "inactive",
    );

    expect(updated).toBeDefined();
    expect(updated?.status).toBe("inactive");
  });

  it("should reject a second store for the same owner", async () => {
    const user = await createTestUser();

    await storeRepository.create({
      owner_id: user.id,
      name: "Première Boutique",
      country: "TG",
      city: "Lomé",
      currency: "XOF",
    });

    await expect(
      storeRepository.create({
        owner_id: user.id,
        name: "Deuxième Boutique",
        country: "TG",
        city: "Lomé",
        currency: "XOF",
      }),
    ).rejects.toThrow();
  });

  it("should reject an invalid country code", async () => {
    const user = await createTestUser();

    await expect(
      storeRepository.create({
        owner_id: user.id,
        name: "Boutique Test",
        country: "TOGO",
        city: "Lomé",
        currency: "XOF",
      }),
    ).rejects.toThrow();
  });

  it("should reject an invalid currency code", async () => {
    const user = await createTestUser();

    await expect(
      storeRepository.create({
        owner_id: user.id,
        name: "Boutique Test",
        country: "TG",
        city: "Lomé",
        currency: "FCFA",
      }),
    ).rejects.toThrow();
  });
});
