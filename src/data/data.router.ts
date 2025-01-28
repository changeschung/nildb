import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { PathsV1 } from "#/common/paths";
import type { AppBindings } from "#/env";
import { isRoleAllowed } from "#/middleware/auth.middleware";
import * as DataController from "./data.controllers";

export const DataEndpointV1 = {
  Base: "/api/v1/data",
  Upload: "/api/v1/data/create",
  Read: "/api/v1/data/read",
  Update: "/api/v1/data/update",
  Delete: "/api/v1/data/delete",
  Flush: "/api/v1/data/flush",
  Tail: "/api/v1/data/tail",
} as const;

export function buildDataRouter(app: App, _bindings: AppBindings): void {
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  app.use(PathsV1.data.root, async (c, next): Promise<void | Response> => {
    return isRoleAllowed(c, ["organization"])
      ? next()
      : c.text("UNAUTHORIZED", StatusCodes.UNAUTHORIZED);
  });

  DataController.deleteD(app);
  DataController.flush(app);
  DataController.read(app);
  DataController.tail(app);
  DataController.update(app);
  DataController.upload(app);
}
