import { Router } from "express";
import { AccountController } from "./controllers";

export const AccountsEndpointV1 = {
  Base: "/api/v1/accounts",
} as const;

export function buildAccountsRouter(): Router {
  const router = Router();

  router.get(AccountsEndpointV1.Base, AccountController.get);
  router.post(AccountsEndpointV1.Base, AccountController.register);
  router.delete(AccountsEndpointV1.Base, AccountController.remove);

  return router;
}
