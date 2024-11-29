import type { Db, MongoClient } from "mongodb";
import type { Logger } from "pino";
import { z } from "zod";
import { createLogger } from "#/common/logging";
import { initAndCreateDbClients } from "./common/mongo";

const ConfigSchema = z.object({
  dbNamePrefix: z.string().min(4),
  dbUri: z.string().startsWith("mongodb"),
  env: z.enum(["test", "dev", "prod"]),
  jwtSecret: z.string().min(10),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  webPort: z.number().int().positive(),
});
export type Config = z.infer<typeof ConfigSchema>;

export interface Context {
  config: Config;
  db: {
    // Default db is the primary (eg `datablocks`)
    client: MongoClient;
    // Holds organizations, users, schemas, queries collections (eg `datablocks`)
    primary: Db;
    // Holds schema data (eg `datablocks_data`)~
    data: Db;
  };
  log: Logger;
}

export async function createContext(): Promise<Context> {
  const config = ConfigSchema.parse({
    dbNamePrefix: process.env.APP_DB_NAME_PREFIX,
    dbUri: process.env.APP_DB_URI,
    env: process.env.APP_ENV,
    jwtSecret: process.env.APP_JWT_SECRET,
    logLevel: process.env.APP_LOG_LEVEL,
    webPort: Number(process.env.APP_PORT),
  });

  return {
    config,
    db: await initAndCreateDbClients(config),
    log: createLogger(config),
  };
}
