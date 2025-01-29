import { Effect as E, pipe } from "effect";
import * as AccountService from "#/accounts/accounts.services";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import type { NilDid } from "#/common/nil-did";
import { PathsV1 } from "#/common/paths";
import type { UuidDto } from "#/common/types";
import { payloadValidator } from "#/common/zod-utils";
import * as AdminService from "./admin.services";
import {
  type AccountDocument,
  AdminCreateAccountRequestSchema,
  AdminDeleteAccountRequestSchema,
  AdminSetSubscriptionStateRequestSchema,
} from "./admin.types";

export function create(app: App): void {
  app.post(
    PathsV1.admin.accounts.root,
    payloadValidator(AdminCreateAccountRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        AccountService.createAccount(c.env, payload),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function deleteA(app: App): void {
  app.delete(
    PathsV1.admin.accounts.root,
    payloadValidator(AdminDeleteAccountRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        AdminService.deleteAccount(c.env, payload.id),
        foldToApiResponse<NilDid>(c),
        E.runPromise,
      );
    },
  );
}

export function list(app: App): void {
  app.get(PathsV1.admin.accounts.root, async (c): Promise<Response> => {
    return await pipe(
      AdminService.listAllAccounts(c.env),
      foldToApiResponse<AccountDocument[]>(c),
      E.runPromise,
    );
  });
}

export function setSubscriptionState(app: App): void {
  app.post(
    PathsV1.admin.accounts.subscriptions,
    payloadValidator(AdminSetSubscriptionStateRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        AccountService.setSubscriptionState(c.env, payload.ids, payload.active),
        foldToApiResponse<NilDid[]>(c),
        E.runPromise,
      );
    },
  );
}
