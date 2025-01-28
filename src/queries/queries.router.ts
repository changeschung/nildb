import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { PathsV1 } from "#/common/paths";
import type { AppBindings } from "#/env";
import { isRoleAllowed } from "#/middleware/auth.middleware";
import * as QueriesController from "#/queries/queries.controllers";

export function buildQueriesRouter(app: App, _bindings: AppBindings): void {
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  app.use(PathsV1.queries.root, async (c, next): Promise<void | Response> => {
    return isRoleAllowed(c, ["organization"])
      ? next()
      : c.text("UNAUTHORIZED", StatusCodes.UNAUTHORIZED);
  });

  QueriesController.add(app);
  QueriesController.deleteQ(app);
  QueriesController.execute(app);
  QueriesController.list(app);
}
