import { Router } from "express";
import { AdminController } from "./controllers";

export const AdminEndpointV1 = {
  Accounts: "/api/v1/admin/accounts",
} as const;

export function buildAdminRouter(): Router {
  const router = Router();

  router.get(AdminEndpointV1.Accounts, AdminController.listAccounts);
  router.post(AdminEndpointV1.Accounts, AdminController.createAdminAccount);
  router.delete(
    `${AdminEndpointV1.Accounts}/:accountDid`,
    AdminController.removeAccount,
  );

  return router;
}
