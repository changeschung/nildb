import type { MiddlewareHandler } from "hono";
import { logger as loggingMiddleware } from "hono/logger";
import pino, { type Logger } from "pino";
import { loadEnv } from "#/env";

export function createLogger(): Logger<never, boolean> {
  const { env, logLevel } = loadEnv();

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

export function logging(): MiddlewareHandler {
  function stripAnsi(str: string): string {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: strip console colour code for aws logging
    return str.replace(/\u001b\[\d+m/g, "");
  }

  const options = {
    level: "debug",
    transport: {
      target: "pino/file",
      options: {
        colorize: false,
        destination: 1, // stdout
      },
    },
    formatters: {
      level: (label: unknown) => ({ level: label }),
    },
    timestamp: false,
    base: null,
  };

  const log = pino(options);

  return loggingMiddleware((message: string): void => {
    log.debug(stripAnsi(message));
  });
}
