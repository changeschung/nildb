import { Router } from "express";
import { AdminController } from "./controllers";

export const AdminEndpointV1 = {
  Accounts: "/api/v1/admin/accounts",
  Data: {
    Delete: "/api/v1/admin/data/delete",
    Flush: "/api/v1/admin/data/flush",
    Read: "/api/v1/admin/data/read",
    Tail: "/api/v1/admin/data/tail",
    Update: "/api/v1/admin/data/update",
    Upload: "/api/v1/admin/data/upload",
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

  router.get(AdminEndpointV1.Accounts, AdminController.listAccounts);
  router.post(AdminEndpointV1.Accounts, AdminController.createAdminAccount);
  router.delete(
    `${AdminEndpointV1.Accounts}/:accountDid`,
    AdminController.removeAccount,
  );

  router.post(AdminEndpointV1.Data.Delete, AdminController.deleteData);
  router.post(AdminEndpointV1.Data.Flush, AdminController.flushData);
  router.post(AdminEndpointV1.Data.Read, AdminController.readData);
  router.post(AdminEndpointV1.Data.Tail, AdminController.tailData);
  router.post(AdminEndpointV1.Data.Update, AdminController.updateData);
  router.post(AdminEndpointV1.Data.Upload, AdminController.uploadData);

  router.post(AdminEndpointV1.Queries.Base, AdminController.addQuery);
  router.delete(AdminEndpointV1.Queries.Base, AdminController.deleteQuery);
  router.post(AdminEndpointV1.Queries.Execute, AdminController.executeQuery);

  router.post(AdminEndpointV1.Schemas.Base, AdminController.addSchema);
  router.delete(AdminEndpointV1.Schemas.Base, AdminController.deleteSchema);

  return router;
}
