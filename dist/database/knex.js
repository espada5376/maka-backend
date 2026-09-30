import knex from "knex";
import config from "./config.js";
const db = knex(config);
export default db;
