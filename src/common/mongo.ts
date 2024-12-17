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
