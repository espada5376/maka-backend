import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  SessionRepository,
} from "../../../src/database/repositories/session.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import {
  CartRepository,
} from "../../../src/database/repositories/cart.repository";

import { cleanDatabase } from "../../helpers/database";

describe("SessionRepository", () => {
  const sessionRepository =
    new SessionRepository(db);

  const userRepository =
    new UserRepository(db);

  const cartRepository =
    new CartRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  function futureDate(
    days = 1,
  ): Date {
    return new Date(
      Date.now() +
        days * 24 * 60 * 60 * 1000,
    );
  }

  function pastDate(): Date {
    return new Date(
      Date.now() -
        24 * 60 * 60 * 1000,
    );
  }

  async function createUser() {
    return userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 100000,
      )}`,
      name: "Test User",
    });
  }

  async function createAnonymousSession() {
    return sessionRepository.create({
      user_id: null,
      expires_at: futureDate(),
    });
  }

  async function createAuthenticatedSession() {
    const user = await createUser();

    const session =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    return {
      user,
      session,
    };
  }

  it("should create an authenticated session", async () => {
    const user = await createUser();

    const session =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.user_id).toBe(user.id);
    expect(session.created_at).toBeDefined();
    expect(session.last_seen_at).toBeDefined();
    expect(session.expires_at).toBeDefined();
  });

  it("should create an anonymous session", async () => {
    const session =
      await createAnonymousSession();

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.user_id).toBeNull();
  });

  it("should allow an explicit null user", async () => {
    const session =
      await sessionRepository.create({
        user_id: null,
        expires_at: futureDate(),
      });

    expect(session.user_id).toBeNull();
  });

  it("should find a session by id", async () => {
    const session =
      await createAnonymousSession();

    const found =
      await sessionRepository.findById(
        session.id,
      );

    expect(found).toBeDefined();
    expect(found?.id).toBe(session.id);
  });

  it("should return undefined for an unknown id", async () => {
    const found =
      await sessionRepository.findById(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(found).toBeUndefined();
  });

  it("should find sessions by user id", async () => {
    const user = await createUser();

    const first =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    const second =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    const sessions =
      await sessionRepository.findByUserId(
        user.id,
      );

    expect(sessions).toHaveLength(2);

    expect(
      sessions.map(
        (session) => session.id,
      ),
    ).toEqual(
      expect.arrayContaining([
        first.id,
        second.id,
      ]),
    );
  });

  it("should not return sessions from another user", async () => {
    const user1 = await createUser();
    const user2 = await createUser();

    const session1 =
      await sessionRepository.create({
        user_id: user1.id,
        expires_at: futureDate(),
      });

    await sessionRepository.create({
      user_id: user2.id,
      expires_at: futureDate(),
    });

    const sessions =
      await sessionRepository.findByUserId(
        user1.id,
      );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(
      session1.id,
    );
  });

  it("should return an empty array for a user without sessions", async () => {
    const user = await createUser();

    const sessions =
      await sessionRepository.findByUserId(
        user.id,
      );

    expect(sessions).toEqual([]);
  });

  it("should order user sessions by newest first", async () => {
    const user = await createUser();

    const older =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    const newer =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    await db("sessions")
      .where({ id: older.id })
      .update({
        created_at: new Date(
          Date.now() - 60_000,
        ),
      });

    await db("sessions")
      .where({ id: newer.id })
      .update({
        created_at: new Date(),
      });

    const sessions =
      await sessionRepository.findByUserId(
        user.id,
      );

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe(
      newer.id,
    );
    expect(sessions[1].id).toBe(
      older.id,
    );
  });

  it("should reject a session with a nonexistent user", async () => {
    await expect(
      sessionRepository.create({
        user_id:
          "00000000-0000-0000-0000-000000000000",
        expires_at: futureDate(),
      }),
    ).rejects.toThrow();
  });

  it("should update a session expiration date", async () => {
  const session =
    await createAnonymousSession();

  const newExpiration =
    futureDate(7);

  const updated =
    await sessionRepository.update(
      session.id,
      {
        expires_at: newExpiration,
      },
    );

  expect(updated).toBeDefined();
  expect(updated?.id).toBe(session.id);

  expect(
    new Date(
      updated!.expires_at,
    ).getTime(),
  ).toBe(
    newExpiration.getTime(),
  );
});

  it("should return undefined when updating an unknown session", async () => {
  const updated =
    await sessionRepository.update(
      "00000000-0000-0000-0000-000000000000",
      {
        expires_at: futureDate(7),
      },
    );

  expect(updated).toBeUndefined();
});

  it("should delete a session", async () => {
    const session =
      await createAnonymousSession();

    const deleted =
      await sessionRepository.delete(
        session.id,
      );

    expect(deleted).toBe(1);

    const found =
      await sessionRepository.findById(
        session.id,
      );

    expect(found).toBeUndefined();
  });

  it("should return zero when deleting an unknown session", async () => {
    const deleted =
      await sessionRepository.delete(
        "00000000-0000-0000-0000-000000000000",
      );

    expect(deleted).toBe(0);
  });

  it("should cascade delete the cart when the session is deleted", async () => {
    const session =
      await createAnonymousSession();

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    expect(cart).toBeDefined();

    const deleted =
      await sessionRepository.delete(
        session.id,
      );

    expect(deleted).toBe(1);

    const deletedCart =
      await db("carts")
        .where({ id: cart.id })
        .first();

    expect(deletedCart).toBeUndefined();
  });

  it("should reject deleting a session referenced by an order", async () => {
    const user = await createUser();

    const session =
      await sessionRepository.create({
        user_id: user.id,
        expires_at: futureDate(),
      });

    const store = await db("stores")
      .insert({
        owner_id: user.id,
        name: "Test Store",
        description: null,
        country: "TG",
        city: "Lome",
        currency: "XOF",
        status: "active",
      })
      .returning("*")
      .then(
        ([createdStore]) =>
          createdStore,
      );

    await db("orders").insert({
      reference: `ORD-${Date.now()}`,
      idempotency_key: `idem-${Date.now()}-${Math.random()}`,
      store_id: store.id,
      buyer_user_id: user.id,
      session_id: session.id,
      status: "pending",
      total_amount: 1000,
      currency: "XOF",
      buyer_phone: "90000000",
      delivery_country: "TG",
      delivery_city: "Lome",
      delivery_address: "Test address",
    });

    await expect(
      sessionRepository.delete(
        session.id,
      ),
    ).rejects.toThrow();

    const stillExists =
      await sessionRepository.findById(
        session.id,
      );

    expect(stillExists).toBeDefined();
  });

  it("should preserve an anonymous session after user-related operations", async () => {
    const session =
      await createAnonymousSession();

    expect(session.user_id).toBeNull();

    const found =
      await sessionRepository.findById(
        session.id,
      );

    expect(found).toBeDefined();
    expect(found?.user_id).toBeNull();
  });

  it("should preserve the session expiration timestamp", async () => {
    const expiration =
      futureDate(3);

    const session =
      await sessionRepository.create({
        user_id: null,
        expires_at: expiration,
      });

    const found =
      await sessionRepository.findById(
        session.id,
      );

    expect(found).toBeDefined();

    expect(
      new Date(
        found!.expires_at,
      ).getTime(),
    ).toBe(expiration.getTime());
  });
});
