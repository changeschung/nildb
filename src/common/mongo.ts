import { type Document, MongoClient, type UUID } from "mongodb";
import mongoose from "mongoose";
import type { Config, Context } from "#/env";

export type DocumentBase = Document & {
  _id: UUID;
  _created: Date;
  _updated: Date;
};

export async function initAndCreateDbClients(
  env: Config,
): Promise<Context["db"]> {
  const primaryDbUri = `${env.dbUri}/${env.dbNamePrefix}`;
  const dataDbName = `${env.dbNamePrefix}_data`;

  // All Models share the pool initialised with this call and mongoose expects the database in the uri
  await mongoose.connect(primaryDbUri, { bufferCommands: false });

  // Create "vanilla" mongo client and db connections
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
