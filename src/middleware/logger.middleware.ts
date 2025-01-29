import type { MiddlewareHandler } from "hono";
import type { Logger } from "pino";

export function useLoggerMiddleware(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const start = performance.now();
    const { method, url } = c.req;

    try {
      await next();

      const end = performance.now();
      const status = c.res.status;

      const logLevel =
        status >= 500
          ? "error"
          : status >= 400
            ? "warn"
            : status >= 300
              ? "silent"
              : "debug";

      if (logLevel !== "silent") {
        logger[logLevel]({
          method,
          url,
          status,
          duration: `${Math.round(end - start)}ms`,
        });
      }
    } catch (err) {
      logger.error({
        err,
        method,
        url,
        duration: `${Math.round(performance.now() - start)}ms`,
      });
      throw err;
    }
  };
}
