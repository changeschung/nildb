import { Effect as E, pipe } from "effect";
import type { MiddlewareHandler, Next } from "hono";
import { StatusCodes } from "http-status-codes";
import { PathsV1 } from "#/common/paths";
import type { AppBindings, AppContext } from "#/env";
import * as SystemService from "#/system/system.services";

export function useMaintenanceMiddleware(
  _bindings: AppBindings,
): MiddlewareHandler {
  return async (c: AppContext, next: Next) => {
    if (PathsV1.admin.system.maintenance === c.req.path) {
      return next();
    }

    return pipe(
      SystemService.getMaintenanceStatus(_bindings),
      E.match({
        onFailure: (error) => {
          c.env.log.debug("Request failed: %O", error);
          return c.json(
            {
              errors: error.humanize(),
              ts: new Date(),
            },
            StatusCodes.BAD_REQUEST,
          );
        },
        onSuccess: (maintenanceStatus) => {
          if (maintenanceStatus.active) {
            return c.json(
              {
                ts: new Date(),
                errors: ["Node in maintenance"],
              },
              StatusCodes.SERVICE_UNAVAILABLE,
            );
          }

          return next();
        },
      }),
      E.runPromise,
    );
  };
}
