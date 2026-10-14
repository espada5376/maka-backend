
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const config = {
  client: "pg",

  connection: isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 5432),
        database: isTest
          ? process.env.TEST_DB_NAME
          : process.env.DB_NAME,
        user: isTest
          ? process.env.TEST_DB_USER
          : process.env.DB_USER,
        password: isTest
          ? process.env.TEST_DB_PASSWORD
          : process.env.DB_PASSWORD,
      },

  migrations: {
    directory: isProduction
      ? "./dist/database/migrations"
      : "./src/database/migrations",

    extension: isProduction ? "js" : "ts",
  },
};

export default config;
