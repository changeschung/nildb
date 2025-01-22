import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { UUID } from "mongodb";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { ControllerError } from "#/common/app-error";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import type { QueryDocument } from "./repository";
import * as QueriesService from "./service";

export type ListQueriesResponse = ApiResponse<QueryDocument[]>;

export const listQueries: RequestHandler<
  EmptyObject,
  ListQueriesResponse,
  EmptyObject
> = async (req, res) => {
  const { ctx } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    QueriesService.findQueries(ctx, account._id),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const ExecuteQueryRequest = z.object({
  id: Uuid,
  variables: z.record(z.string(), z.unknown()),
});
export type ExecuteQueryRequest = z.infer<typeof ExecuteQueryRequest>;
export type ExecuteQueryResponse = ApiResponse<JsonValue>;

export const executeQuery: RequestHandler<
  EmptyObject,
  ExecuteQueryResponse,
  ExecuteQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<ExecuteQueryRequest>(() => ExecuteQueryRequest.parse(body)),
    E.flatMap((payload) => enforceQueryOwnership(account, payload.id, payload)),
    E.flatMap((payload) => {
      return QueriesService.executeQuery(ctx, payload);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

function enforceQueryOwnership<T>(
  account: OrganizationAccountDocument,
  query: UUID,
  value: T, // pass through on success
): E.Effect<T, ControllerError, never> {
  const isAuthorized = account.queries.some(
    (s) => s.toString() === query.toString(),
  );

  return isAuthorized
    ? E.succeed(value)
    : E.fail(
        new ControllerError({
          reason: ["Query not found", account._id, query.toString()],
        }),
      );
}
