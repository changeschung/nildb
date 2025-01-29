import { Effect as E, pipe } from "effect";
import type { JsonValue } from "type-fest";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { enforceQueryOwnership } from "#/common/ownership";
import { PathsV1 } from "#/common/paths";
import type { UuidDto } from "#/common/types";
import { payloadValidator } from "#/common/zod-utils";
import * as QueriesService from "./queries.services";
import {
  AddQueryRequestSchema,
  DeleteQueryRequestSchema,
  ExecuteQueryRequestSchema,
  type QueryDocument,
} from "./queries.types";

export function add(app: App): void {
  app.post(
    PathsV1.queries.root,
    payloadValidator(AddQueryRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.addQuery(c.env, {
          ...payload,
          owner: account._id,
        }),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function deleteQ(app: App): void {
  app.delete(
    PathsV1.queries.root,
    payloadValidator(DeleteQueryRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceQueryOwnership(account, payload.id, payload),
        E.flatMap((payload) => QueriesService.removeQuery(c.env, payload.id)),
        foldToApiResponse<boolean>(c),
        E.runPromise,
      );
    },
  );
}

export function execute(app: App): void {
  app.post(
    PathsV1.queries.execute,
    payloadValidator(ExecuteQueryRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceQueryOwnership(account, payload.id, payload),
        E.flatMap((payload) => QueriesService.executeQuery(c.env, payload)),
        foldToApiResponse<JsonValue>(c),
        E.runPromise,
      );
    },
  );
}

export function list(app: App): void {
  app.get(PathsV1.queries.root, async (c): Promise<Response> => {
    const account = c.var.account as OrganizationAccountDocument;

    return await pipe(
      QueriesService.findQueries(c.env, account._id),
      foldToApiResponse<QueryDocument[]>(c),
      E.runPromise,
    );
  });
}
