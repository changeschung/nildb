import type { MiddlewareHandler } from "hono";
import { logger as loggingMiddleware } from "hono/logger";
import pino from "pino";

export function logging(): MiddlewareHandler {
  function stripAnsi(str: string): string {
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
