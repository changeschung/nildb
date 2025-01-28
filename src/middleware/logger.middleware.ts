import pino, { type Logger } from "pino";
import pinoHttp, { type HttpLogger } from "pino-http";
import type { Config } from "#/env";

export function loggerMiddleware(env: Config): HttpLogger {
  return pinoHttp({
    logger: createLogger(env),
    customLogLevel: (_req, res, err) => {
      const code = res.statusCode;
      if (400 <= code && code < 500) {
        return "warn";
      }

      if (500 <= code || err) {
        return "error";
      }

      if (300 <= code && code < 400) {
        return "silent";
      }
      return "debug";
    },
  });
}

export function createLogger(env: Config): Logger {
  const transport = process.env.TEST
    ? {
        target: "pino-pretty",
      }
    : undefined;

  return pino({
    level: env.logLevel,
    transport,
  });
}
