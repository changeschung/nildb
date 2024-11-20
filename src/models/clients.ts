import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import type { Variables } from "#/app";
import type { Bindings } from "#/env";

export async function initAndCreateDbClients(
  env: Bindings,
): Promise<Variables["db"]> {
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
