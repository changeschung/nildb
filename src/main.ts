import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { createLogger } from "#/logging";
import { type Variables, buildApp } from "./app";
import { loadEnv } from "./env";

async function main() {
  dotenv.config();
  const Bindings = loadEnv();
  const Log = createLogger();

  Log.info("✅  Initializing nil-db api");

  const primaryDbName = Bindings.dbNamePrefix;
  const dataDbName = `${Bindings.dbNamePrefix}_data`;

  const primaryDbUri = `${Bindings.dbUri}/${primaryDbName}`;
  const dataDbUri = `${Bindings.dbUri}/${dataDbName}`;

  // All Models share the pool initialised with this call
  await mongoose.connect(primaryDbUri, { bufferCommands: false });
  const primary = await MongoClient.connect(primaryDbUri);
  const data = await MongoClient.connect(dataDbUri);
  Log.info("✅  Connected to database");

  const variables: Variables = {
    db: {
      primary,
      data,
    },
    Log,
  };

  const app = buildApp(Bindings, variables);

  serve({
    port: Bindings.webPort,
    fetch: app.fetch,
  });

  Log.info("✅  Nil-db api ready");
}

await main();
