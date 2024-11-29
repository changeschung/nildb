import pino, { type Logger } from "pino";
import type { Config } from "#/env";

export function createLogger(config: Config): Logger {
  const { logLevel, env } = config;

  const options: Record<string, unknown> = {
    level: logLevel,
  };

  if (env.toLowerCase() !== "prod") {
    options.transport = {
      target: "pino-pretty",
    };
  }

  return pino(options);
}
