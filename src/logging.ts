import type { MiddlewareHandler } from "hono";
import { logger as loggingMiddleware } from "hono/logger";
import type { Variables } from "./app";

export function logging(context: Variables): MiddlewareHandler {
  return loggingMiddleware((message: string, ...rest: string[]): void => {
    context.log.debug(message, ...rest);
  });
}
