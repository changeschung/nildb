import { Router } from "express";
import { AccountController } from "./controllers";

export const AccountsEndpointV1 = {
  Base: "/api/v1/accounts",
  Register: "/api/v1/accounts/register",
} as const;

export function buildAccountsRouter(): Router {
  const router = Router();

  router.get(AccountsEndpointV1.Base, AccountController.get);
  router.post(AccountsEndpointV1.Register, AccountController.register);
  router.delete(AccountsEndpointV1.Base, AccountController.remove);

  return router;
}
