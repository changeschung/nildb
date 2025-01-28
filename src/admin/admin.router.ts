import { Router } from "express";
import { StatusCodes } from "http-status-codes";
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

export function buildAdminRouter(): Router {
  const router = Router();

  router.use(AdminEndpointV1.Base, (req, res, next): void => {
    if (!isRoleAllowed(req, ["admin", "root"])) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }
    next();
  });

  router.get(
    AdminEndpointV1.Accounts.Base,
    AdminAccountsControllers.listAccounts,
  );
  router.post(
    AdminEndpointV1.Accounts.Base,
    AdminAccountsControllers.createAccount,
  );
  router.delete(
    AdminEndpointV1.Accounts.Base,
    AdminAccountsControllers.deleteAccount,
  );

  router.post(
    AdminEndpointV1.Accounts.Subscriptions,
    AdminAccountsControllers.setSubscriptionState,
  );

  router.post(AdminEndpointV1.Data.Delete, AdminDataControllers.deleteData);
  router.post(AdminEndpointV1.Data.Flush, AdminDataControllers.flushData);
  router.post(AdminEndpointV1.Data.Read, AdminDataControllers.readData);
  router.post(AdminEndpointV1.Data.Tail, AdminDataControllers.tailData);
  router.post(AdminEndpointV1.Data.Update, AdminDataControllers.updateData);
  router.post(AdminEndpointV1.Data.Upload, AdminDataControllers.uploadData);

  router.post(AdminEndpointV1.Queries.Base, AdminQueriesControllers.addQuery);
  router.delete(
    AdminEndpointV1.Queries.Base,
    AdminQueriesControllers.deleteQuery,
  );
  router.post(
    AdminEndpointV1.Queries.Execute,
    AdminQueriesControllers.executeQuery,
  );

  router.post(AdminEndpointV1.Schemas.Base, AdminSchemasControllers.addSchema);
  router.delete(
    AdminEndpointV1.Schemas.Base,
    AdminSchemasControllers.deleteSchema,
  );

  return router;
}
