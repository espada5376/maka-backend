import knex, { Knex } from "knex";
import config from "./config.js";

const db: Knex = knex(config);

export default db;
