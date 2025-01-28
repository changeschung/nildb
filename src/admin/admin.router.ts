import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { PathsV1 } from "#/common/paths";
import type { AppBindings } from "#/env";
import { isRoleAllowed } from "#/middleware/auth.middleware";
import * as AdminAccountsControllers from "./admin.controllers.accounts";
import * as AdminDataControllers from "./admin.controllers.data";
import * as AdminQueriesControllers from "./admin.controllers.queries";
import * as AdminSchemasControllers from "./admin.controllers.schemas";

export const AdminEndpointV1 = {
  Base: "/api/v1/admin",
  Accounts: {
    Base: "/api/v1/admin/accounts",
    Subscriptions: "/api/v1/admin/accounts/subscription",
  },
  Data: {
    Delete: "/api/v1/admin/data/delete",
    Flush: "/api/v1/admin/data/flush",
    Read: "/api/v1/admin/data/read",
    Tail: "/api/v1/admin/data/tail",
    Update: "/api/v1/admin/data/update",
    Upload: "/api/v1/admin/data/create",
  },
  Queries: {
    Base: "/api/v1/admin/queries",
    Execute: "/api/v1/admin/queries/execute",
  },
  Schemas: {
    Base: "/api/v1/admin/schemas",
  },
} as const;

export function buildAdminRouter(app: App, _bindings: AppBindings): void {
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
  app.use(PathsV1.admin.root, async (c, next): Promise<void | Response> => {
    return isRoleAllowed(c, ["admin", "root"])
      ? next()
      : c.text("UNAUTHORIZED", StatusCodes.UNAUTHORIZED);
  });

  AdminAccountsControllers.create(app);
  AdminAccountsControllers.deleteA(app);
  AdminAccountsControllers.list(app);
  AdminAccountsControllers.setSubscriptionState(app);

  AdminDataControllers.deleteD(app);
  AdminDataControllers.flush(app);
  AdminDataControllers.read(app);
  AdminDataControllers.tail(app);
  AdminDataControllers.update(app);
  AdminDataControllers.upload(app);

  AdminQueriesControllers.add(app);
  AdminQueriesControllers.deleteQ(app);
  AdminQueriesControllers.execute(app);

  AdminSchemasControllers.add(app);
  AdminSchemasControllers.deleteS(app);
}
