import { Effect as E, pipe } from "effect";
import { StatusCodes, getReasonPhrase } from "http-status-codes";
import type { App } from "#/app";
import { SystemEndpoint } from "#/system/system.router";
import * as SystemService from "./system.services";

export function aboutNode(app: App): void {
  app.get(SystemEndpoint.About, (c): Response => {
    const aboutNode = SystemService.getNodeInfo(c.env);
    return c.json(aboutNode);
  });
}

export function healthCheck(app: App): void {
  app.get(SystemEndpoint.Health, async (c) => {
    return await pipe(
      SystemService.getMaintenanceStatus(c.env),
      E.flatMap((maintenanceStatus) => {
        if (maintenanceStatus.active) {
          return E.succeed(
            c.text(getReasonPhrase(StatusCodes.SERVICE_UNAVAILABLE)),
          );
        }
        return E.succeed(c.text(getReasonPhrase(StatusCodes.OK)));
      }),
      E.runPromise,
    );
  });
}
