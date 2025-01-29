import type { Config as MongoMigrateConfig } from "mongo-migrate-ts/lib/config";
import { MongoClient, type UUID } from "mongodb";
import type { AppBindings, EnvVars } from "#/env";

// A common base for all documents. UUID v4 is used so that records have a unique but stable
// identifier across the cluster.
export type DocumentBase = {
  _id: UUID;
  _created: Date;
  _updated: Date;
};

export async function initAndCreateDbClients(
  env: EnvVars,
): Promise<AppBindings["db"]> {
  const client = await MongoClient.connect(env.dbUri);
  const primary = client.db(env.dbNamePrimary);
  const data = client.db(env.dbNameData);

  return {
    client,
    primary,
    data,
  };
}

export enum CollectionName {
  Accounts = "accounts",
  Schemas = "schemas",
  Queries = "queries",
}

export async function mongoMigrateUp(
  uri: string,
  database: string,
): Promise<void> {
  console.warn("! Database migration check");
  const config: MongoMigrateConfig = {
    uri,
    database,
    migrationsDir: "./migrations",
    globPattern: "[0-9]*_[0-9]*_[a-z]*.ts",
    migrationNameTimestampFormat: "yyyyMMdd_HHmm",
  };

  // mongo-migrate-ts is primarily a CLI tool, but we need to run migrations
  // programmatically on startup and in tests. Using dynamic import here to
  // handle different module resolution between tsx (dist/) and vitest (lib/).
  // additionally, we use a migratePath otherwise tsc complains about type issues in the lib
  const migratePath = "mongo-migrate-ts/lib/commands/up" as const;
  const migrate = await import(migratePath);
  await migrate.up({ config });
}
