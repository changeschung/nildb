import { MongoClient, type UUID } from "mongodb";
import type { Config, Context } from "#/env";

// A common base for all documents. UUID v4 is used so that records have a unique but stable
// identifier across the cluster.
export type DocumentBase = {
  _id: UUID;
  _created: Date;
  _updated: Date;
};

export async function initAndCreateDbClients(
  env: Config,
): Promise<Context["db"]> {
  // From env vars so tests use ephemeral dbs
  const primaryDbUri = `${env.dbUri}/${env.dbNamePrefix}`;
  const dataDbName = `${env.dbNamePrefix}_data`;

  const client = await MongoClient.connect(primaryDbUri);
  const primary = client.db();
  const data = client.db(dataDbName);

  return {
    client,
    primary,
    data,
  };
}

export enum CollectionName {
  Organizations = "organizations",
  Users = "users",
  Schemas = "schemas",
  Queries = "queries",
}
