import { afterAll, describe, expect, it } from "vitest";
import db from "../src/database/knex";

describe("DB speed", () => {
  it("SELECT 1", async () => {
    const start = performance.now();

    await db.raw("SELECT 1");

    console.log(`SELECT 1: ${Math.round(performance.now() - start)}ms`);

    expect(true).toBe(true);
  });

  it("INSERT + SELECT", async () => {
    const start = performance.now();

    await db.raw("SELECT COUNT(*) FROM users");

    console.log(`COUNT users: ${Math.round(performance.now() - start)}ms`);

    expect(true).toBe(true);
  });

  it("TRUNCATE", async () => {
    const start = performance.now();

  await db.raw(`
  TRUNCATE TABLE
    notification_deliveries,
    notifications,
    otp_deliveries,
    otp_verifications,
    events,
    order_items,
    orders,
    cart_items,
    carts,
    product_images,
    products,
    categories,
    stores,
    sessions,
    users,
    insights
`);

    console.log(`TRUNCATE: ${Math.round(performance.now() - start)}ms`);

    expect(true).toBe(true);
  });

  afterAll(async () => {
    await db.destroy();
  });
});
