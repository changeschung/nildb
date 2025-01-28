import { zValidator } from "@hono/zod-validator";
import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import { isRoleAllowed } from "#/middleware/auth.middleware";
import * as AccountService from "./accounts.services";
import {
  RegisterAccountRequestSchema,
  RemoveAccountRequestSchema,
} from "./accounts.types";

export function get(app: App): void {
  app.get(PathsV1.accounts, async (c) => {
    if (!isRoleAllowed(c, ["admin", "organization"])) {
      return c.text("UNAUTHORIZED", StatusCodes.UNAUTHORIZED);
    }

    const account = c.var.account;
    return await pipe(
      AccountService.find(c.env, account._id),
      foldToApiResponse(c),
      E.runPromise,
    );
  });
}

export function register(app: App): void {
  app.post(
    PathsV1.accounts,
    zValidator("json", RegisterAccountRequestSchema),
    async (c) => {
      // Check if account already exists
      if (c.var.account?._type) {
        return c.json(
          {
            ts: new Date(),
            errors: ["Use /admin/* endpoints for account management"],
          },
          StatusCodes.BAD_REQUEST,
        );
      }

      const payload = c.req.valid("json");

      return await pipe(
        AccountService.createAccount(c.env, payload),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function deleteA(app: App): void {
  app.delete(
    PathsV1.accounts,
    zValidator("json", RemoveAccountRequestSchema),
    async (c) => {
      if (!isRoleAllowed(c, ["root", "admin"])) {
        return c.text("UNAUTHORIZED", StatusCodes.UNAUTHORIZED);
      }

      const payload = c.req.valid("json");

      return await pipe(
        AccountService.remove(c.env, payload.id),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}
