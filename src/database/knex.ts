import knex, { Knex } from "knex";
import config from "../../knexfile.js";

const db: Knex = knex(config);

export default db;
