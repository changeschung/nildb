import type { MiddlewareHandler, Next } from "hono";
import { StatusCodes } from "http-status-codes";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { AccountDocument } from "#/admin/admin.types";
import type { AppBindings, AppContext } from "#/env";
import { isPublicPath } from "#/middleware/auth.middleware";

export function useSubscriptionCheckMiddleware(
  _bindings: AppBindings,
): MiddlewareHandler {
  return async (c: AppContext, next: Next) => {
    // public paths don't require subscription
    if (isPublicPath(c.req.path, c.req.method)) {
      return next();
    }

    const account = c.var.account;

    if (isOrganizationAccount(account)) {
      const now = new Date();
      const isSubscriptionActive =
        account.subscription.start <= now && account.subscription.end >= now;
      if (!isSubscriptionActive) {
        return c.json(
          {
            ts: new Date(),
            errors: ["Subscription inactive"],
          },
          StatusCodes.PAYMENT_REQUIRED,
        );
      }
    }
    return next();
  };
}

export function isOrganizationAccount(
  account: AccountDocument,
): account is OrganizationAccountDocument {
  return account._type === "organization";
}
