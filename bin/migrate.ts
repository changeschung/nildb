import dotenv from "dotenv";
import { mongoMigrateCli } from "mongo-migrate-ts";

dotenv.config();

console.warn("! Database migration check");

mongoMigrateCli({
  uri: process.env.APP_DB_URI,
  database: process.env.APP_DB_NAME_PRIMARY,
  migrationsDir: "./migrations",
  globPattern: "[0-9]*_[0-9]*_[a-z]*.ts",
  migrationNameTimestampFormat: "yyyyMMdd_HHmm",
});
