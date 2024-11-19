import { loadEnv } from "#/env";

export enum CollectionName {
  Organizations = "organizations",
  Users = "users",
  Schemas = "schemas",
  Queries = "queries",
}

export function getPrimaryDbName(): string {
  const { dbNamePrefix } = loadEnv();
  return dbNamePrefix;
}

export function getDataDbName(): string {
  const { dbNamePrefix } = loadEnv();
  return `${dbNamePrefix}_data`;
}
