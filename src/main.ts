import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { createLogger } from "#/logging";
import { initAndCreateDbClients } from "#/models/clients";
import { buildApp } from "./app";
import { loadEnv } from "./env";

async function main() {
  dotenv.config();
  const env = loadEnv();
  const Log = createLogger();
  Log.info("✅  Initializing nil-db api");

  const db = await initAndCreateDbClients(env);
  Log.info("✅  Connected to database");

  const app = buildApp(env, {
    db,
    Log,
  });

  serve({
    port: env.webPort,
    fetch: app.fetch,
  });

  Log.info("✅  Nil-db api ready");
}

await main();
