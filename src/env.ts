import type { Db, MongoClient } from "mongodb";
import type { Logger } from "pino";
import { z } from "zod";
import { Identity } from "#/common/crypto";
import { createLogger } from "#/middleware/logger";
import { initAndCreateDbClients } from "./common/mongo";

const ConfigSchema = z.object({
  dbNamePrefix: z.string().min(4),
  dbUri: z.string().startsWith("mongodb"),
  env: z.enum(["test", "dev", "prod"]),
  jwtSecret: z.string().min(10),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  nodePrivateKey: z.string(),
  nodePublicEndpoint: z.string().url(),
  metricsPort: z.number().int().positive(),
  webPort: z.number().int().positive(),
});
export type Config = z.infer<typeof ConfigSchema>;

export interface Context {
  config: Config;
  db: {
    client: MongoClient;
    primary: Db;
    data: Db;
  };
  log: Logger;
  node: {
    endpoint: string;
    identity: Identity;
  };
}

export async function createContext(): Promise<Context> {
  const config = ConfigSchema.parse({
    dbNamePrefix: process.env.APP_DB_NAME_PREFIX,
    dbUri: process.env.APP_DB_URI,
    env: process.env.APP_ENV,
    jwtSecret: process.env.APP_JWT_SECRET,
    logLevel: process.env.APP_LOG_LEVEL,
    nodePrivateKey: process.env.APP_NODE_PRIVATE_KEY,
    nodePublicEndpoint: process.env.APP_NODE_PUBLIC_ENDPOINT,
    metricsPort: Number(process.env.APP_METRICS_PORT),
    webPort: Number(process.env.APP_PORT),
  });

  const identity = Identity.fromBase64(config.nodePrivateKey);

  const node = {
    identity,
    endpoint: config.nodePublicEndpoint,
  };

  return {
    config,
    db: await initAndCreateDbClients(config),
    log: createLogger(config),
    node,
  };
}
