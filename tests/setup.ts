import db from "../src/database/knex";
import { afterAll } from "vitest";

process.env.NODE_ENV = "test";

afterAll(async () => {
  await db.destroy();
});
