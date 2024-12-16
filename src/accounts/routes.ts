import { Router } from "express";
import {
  listAccountsController,
  registerAccountController,
  removeAccountController,
} from "./controllers";

export const AccountsEndpointV1 = {
  Base: "/api/v1/accounts",
} as const;

export function buildAccountsRouter(): Router {
  const router = Router();

  router.get(AccountsEndpointV1.Base, listAccountsController);
  router.post(AccountsEndpointV1.Base, registerAccountController);
  router.delete(AccountsEndpointV1.Base, removeAccountController);

  return router;
}
