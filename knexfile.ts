import "dotenv/config";

const config = {
  client: "pg",
  connection:
    process.env.NODE_ENV === "production"
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT ?? 5432),
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        },
  migrations: {
    directory:
      process.env.NODE_ENV === "production"
        ? "./dist/database/migrations"
        : "./src/database/migrations",
    extension: process.env.NODE_ENV === "production" ? "js" : "ts",
  },
};
export default config;
