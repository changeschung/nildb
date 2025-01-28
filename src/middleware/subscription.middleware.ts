import type { RequestHandler } from "express";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { Context } from "#/env";
import { isPublicPath } from "#/middleware/auth.middleware";

export function useSubscriptionCheckMiddleware(_ctx: Context): RequestHandler {
  return async (req, res, next) => {
    const type = req.account?._type;

    // registration endpoint does not require subscription
    if (["root", "admin"].includes(type)) {
      return next();
    }

    // public paths do not require subscription
    if (isPublicPath(req)) {
      next();
      return;
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
