import path from "node:path";
import { fileURLToPath } from "node:url";
import { mongoMigrateCli } from "mongo-migrate-ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "./migrations");

mongoMigrateCli({
  uri: "mongodb://localhost:27017",
  database: "datablocks",
  migrationsDir,
  migrationsCollection: "migrations_collection",
  migrationNameTimestampFormat: "yyyyMMddHHmm",
});
