import pinoHttp from "pino-http";
import { createLogger } from "#/common/logging";
import type { Config } from "#/env";

export function loggerMiddleware(env: Config) {
  const logger = createLogger(env);
  return pinoHttp({ logger });
}
