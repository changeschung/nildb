import pino, { type Logger } from "pino";

export function createLogger(level: string): Logger {
  const transport = process.env.TEST
    ? {
        target: "pino-pretty",
      }
    : undefined;

  return pino({
    level,
    transport,
  });
}
