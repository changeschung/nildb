import { createHash } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bech32 } from "bech32";
import type { Db, MongoClient } from "mongodb";
import type { Logger } from "pino";
import { z } from "zod";
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
    address: string;
    privateKey: Uint8Array;
    publicKey: string;
    endpoint: string;
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

  const privateKey = Uint8Array.from(
    Buffer.from(config.nodePrivateKey, "base64"),
  );
  const publicKey = secp256k1.getPublicKey(privateKey, true);
  const sha256Hash = createHash("sha256").update(publicKey).digest();
  const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
  const prefix = "nillion1";
  const address = bech32.encode(prefix, bech32.toWords(ripemd160Hash));

  const node = {
    address,
    publicKey: Buffer.from(publicKey).toString("base64"),
    privateKey,
    endpoint: config.nodePublicEndpoint,
  };

  return {
    config,
    db: await initAndCreateDbClients(config),
    log: createLogger(config),
    node,
  };
}
