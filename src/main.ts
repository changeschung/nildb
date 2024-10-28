import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import pino from "pino";
import { type Bindings, type Variables, buildApp } from "./app";

dotenv.config();

const name = String(process.env.APP_ENV ?? "prod");
const webPort = Number(process.env.APP_PORT);
const dbUri = String(process.env.APP_DB_URI);
const jwtSecret = String(process.env.APP_JWT_SECRET);
const logLevel = String(process.env.APP_LOG_LEVEL);

const options: Record<string, unknown> = {
  level: logLevel,
};

if (name.toLowerCase() !== "prod") {
  options.transport = {
    target: "pino-pretty",
  };
}

const log = pino(options);
log.info("🚀 Starting nil-db api");

// how do I pass these into hono?
const bindings: Bindings = {
  name,
  webPort,
  dbUri,
  jwtSecret,
  logLevel,
};

const variables: Variables = {
  db: {
    mongo: await MongoClient.connect(dbUri),
    mongoose: await mongoose.connect(dbUri),
  },
  log,
};

const app = buildApp(bindings, variables);

serve({
  port: bindings.webPort,
  fetch: app.fetch,
});
