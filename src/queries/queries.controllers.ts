import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { enforceQueryOwnership } from "#/common/ownership";
import { PathsV1 } from "#/common/paths";
import { payloadValidator } from "#/common/zod-utils";
import * as QueriesService from "./queries.services";
import {
  AddQueryRequestSchema,
  DeleteQueryRequestSchema,
  ExecuteQueryRequestSchema,
} from "./queries.types";

export function add(app: App): void {
  app.post(
    PathsV1.queries.root,
    payloadValidator(AddQueryRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return pipe(
        QueriesService.addQuery(c.env, {
          ...payload,
          owner: account._id,
        }),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function remove(app: App): void {
  app.delete(
    PathsV1.queries.root,
    payloadValidator(DeleteQueryRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return pipe(
        enforceQueryOwnership(account, payload.id),
        E.flatMap(() => QueriesService.removeQuery(c.env, payload.id)),
        E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
        handleTaggedErrors(c),
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

      return pipe(
        enforceQueryOwnership(account, payload.id),
        E.flatMap(() => QueriesService.executeQuery(c.env, payload)),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function list(app: App): void {
  app.get(PathsV1.queries.root, async (c) => {
    const account = c.var.account as OrganizationAccountDocument;

    return pipe(
      QueriesService.findQueries(c.env, account._id),
      E.map((data) => c.json({ data })),
      handleTaggedErrors(c),
      E.runPromise,
    );
  });
}
