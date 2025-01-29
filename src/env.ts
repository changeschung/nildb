import type { JWTPayload } from "did-jwt";
import type { Context } from "hono";
import type { Db, MongoClient } from "mongodb";
import type { Logger } from "pino";
import { z } from "zod";
import type { AccountDocument, RootAccountDocument } from "#/admin/admin.types";
import { CACHE_FOREVER, Cache } from "#/common/cache";
import { Identity } from "#/common/identity";
import { createLogger } from "#/common/logger";
import type { NilDid } from "#/common/nil-did";
import { initAndCreateDbClients } from "./common/mongo";

export const PRIVATE_KEY_LENGTH = 64;
export const PUBLIC_KEY_LENGTH = 66;

export type AppContext = Context<AppEnv>;

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};

export const EnvVarsSchema = z.object({
  dbNamePrimary: z.string().min(4),
  dbNameData: z.string().min(4),
  dbUri: z.string().startsWith("mongodb"),
  env: z.enum(["testnet", "mainnet"]),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  nodeSecretKey: z.string().min(PRIVATE_KEY_LENGTH),
  nodePublicEndpoint: z.string().url(),
  metricsPort: z.number().int().positive(),
  webPort: z.number().int().positive(),
});
export type EnvVars = z.infer<typeof EnvVarsSchema>;

export type AppBindings = {
  config: EnvVars;
  db: {
    client: MongoClient;
    primary: Db;
    data: Db;
  };
  cache: {
    accounts: Cache<NilDid, AccountDocument>;
  };
  log: Logger;
  node: {
    endpoint: string;
    identity: Identity;
  };
};

// There are some roots where the JWT won't be present and so this type isn't correct (e.g. registration,
// health, about). However, narrowing the type here to avoid use in those edge cases would cascade to
// the majority of routes, which require auth. So the risk is accepted here to avoid the type complexity cascade.
export type AppVariables = {
  jwt: JWTPayload;
  account: AccountDocument;
};

export async function loadBindings(override?: EnvVars): Promise<AppBindings> {
  const config = override
    ? override
    : EnvVarsSchema.parse({
        dbNamePrimary: process.env.APP_DB_NAME_PRIMARY,
        dbNameData: process.env.APP_DB_NAME_DATA,
        dbUri: process.env.APP_DB_URI,
        env: process.env.APP_ENV,
        logLevel: process.env.APP_LOG_LEVEL,
        nodeSecretKey: process.env.APP_NODE_SECRET_KEY,
        nodePublicEndpoint: process.env.APP_NODE_PUBLIC_ENDPOINT,
        metricsPort: Number(process.env.APP_METRICS_PORT),
        webPort: Number(process.env.APP_PORT),
      });

  const node = {
    identity: Identity.fromSk(config.nodeSecretKey),
    endpoint: config.nodePublicEndpoint,
  };

  // Hydrate with non-expiring root account
  const accounts = new Cache<NilDid, AccountDocument>();
  const rootDocument: RootAccountDocument = {
    _id: node.identity.did,
    _type: "root",
    publicKey: node.identity.pk,
  };
  accounts.set(node.identity.did, rootDocument, CACHE_FOREVER);

  return {
    config,
    cache: {
      accounts,
    },
    db: await initAndCreateDbClients(config),
    log: createLogger(config.logLevel),
    node,
  };
}
