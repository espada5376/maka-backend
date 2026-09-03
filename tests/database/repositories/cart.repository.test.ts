import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import db from "../../../src/database/knex";

import {
  CartRepository,
} from "../../../src/database/repositories/cart.repository";

import {
  UserRepository,
} from "../../../src/database/repositories/user.repository";

import { cleanDatabase } from "../../helpers/database";

describe("CartRepository", () => {
  const cartRepository = new CartRepository(db);
  const userRepository = new UserRepository(db);

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  async function createSession() {
    const user = await userRepository.create({
      phone: `9${Date.now()}${Math.floor(
        Math.random() * 1000,
      )}`,
      name: "Test User",
    });

    const [session] = await db("sessions")
      .insert({
        user_id: user.id,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      })
      .returning("*");

    return session;
  }

  async function createAnonymousSession() {
    const [session] = await db("sessions")
      .insert({
        user_id: null,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      })
      .returning("*");

    return session;
  }

  it("should create a cart", async () => {
    const session =
      await createAnonymousSession();

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    expect(cart).toBeDefined();
    expect(cart.session_id).toBe(session.id);
    expect(cart.id).toBeDefined();
  });

  it("should find a cart by id", async () => {
    const session =
      await createAnonymousSession();

    const created =
      await cartRepository.create({
        session_id: session.id,
      });

    const cart =
      await cartRepository.findById(
        created.id,
      );

    expect(cart).toBeDefined();
    expect(cart?.id).toBe(created.id);
  });

  it("should find a cart by session id", async () => {
    const session =
      await createAnonymousSession();

    const created =
      await cartRepository.create({
        session_id: session.id,
      });

    const cart =
      await cartRepository.findBySessionId(
        session.id,
      );

    expect(cart).toBeDefined();
    expect(cart?.id).toBe(created.id);
  });

  it("should support anonymous sessions", async () => {
    const session =
      await createAnonymousSession();

    expect(session.user_id).toBeNull();

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    expect(cart.session_id).toBe(session.id);
  });

  it("should support authenticated sessions", async () => {
    const session =
      await createSession();

    expect(session.user_id).not.toBeNull();

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    expect(cart.session_id).toBe(session.id);
  });

  it("should reject duplicate carts for the same session", async () => {
    const session =
      await createAnonymousSession();

    await cartRepository.create({
      session_id: session.id,
    });

    await expect(
      cartRepository.create({
        session_id: session.id,
      }),
    ).rejects.toThrow();
  });

  it("should reject a cart for a nonexistent session", async () => {
    await expect(
      cartRepository.create({
        session_id:
          "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });

  it("should return an existing cart with findOrCreateBySessionId", async () => {
    const session =
      await createAnonymousSession();

    const first =
      await cartRepository.findOrCreateBySessionId(
        session.id,
      );

    const second =
      await cartRepository.findOrCreateBySessionId(
        session.id,
      );

    expect(second.id).toBe(first.id);

    const carts = await db("carts")
      .where({
        session_id: session.id,
      });

    expect(carts).toHaveLength(1);
  });

  it("should create a cart with findOrCreateBySessionId", async () => {
    const session =
      await createAnonymousSession();

    const cart =
      await cartRepository.findOrCreateBySessionId(
        session.id,
      );

    expect(cart).toBeDefined();
    expect(cart.session_id).toBe(session.id);
  });

  it("should cascade delete the cart when the session is deleted", async () => {
    const session =
      await createAnonymousSession();

    const cart =
      await cartRepository.create({
        session_id: session.id,
      });

    await db("sessions")
      .where({ id: session.id })
      .del();

    const deletedCart =
      await cartRepository.findById(
        cart.id,
      );

    expect(deletedCart).toBeUndefined();
  });
});
