import { afterAll } from "vitest";

process.env.NODE_ENV = "test";

const { default: db } = await import("../src/database/knex.js");

afterAll(async () => {
  await db.destroy();
});
