import type { RequestHandler } from "express";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { AccountsEndpointV1 } from "#/accounts/routes";
import type { Context } from "#/env";

export function useSubscriptionCheckMiddleware(_ctx: Context): RequestHandler {
  return async (req, res, next) => {
    const type = req.account?._type;

    // registration endpoint does not require subscription
    if (["root", "admin"].includes(type)) {
      return next();
    }

    // registration endpoint does not require subscription
    if (
      req.path.toLowerCase() === AccountsEndpointV1.Base &&
      req.method === "POST"
    ) {
      return next();
    }

    const account = req.account as OrganizationAccountDocument;
    if (!account.subscription.active) {
      res.status(402).json({
        ts: new Date(),
        errors: ["Subscription inactive"],
      });
      return;
    }
    return next();
  };
}
