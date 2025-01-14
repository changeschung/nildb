import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { UUID } from "mongodb";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { ControllerError } from "#/common/app-error";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { Uuid, type UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import { isRoleAllowed } from "#/middleware/auth";
import type { QueryDocument } from "./repository";
import { QueriesService } from "./service";

export type ListQueriesResponse = ApiResponse<QueryDocument[]>;

const listQueries: RequestHandler<
  EmptyObject,
  ListQueriesResponse,
  EmptyObject
> = async (req, res) => {
  const { ctx } = req;

  if (!isRoleAllowed(req, ["organization"])) {
    res.sendStatus(401);
    return;
  }
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    QueriesService.findQueries(ctx, account._id),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

const VariablePrimitive = z.enum(["string", "number", "boolean", "date"]);
export const QueryVariableValidator = z.union([
  z.object({
    type: VariablePrimitive,
    description: z.string(),
  }),
  z.object({
    type: z.enum(["array"]),
    description: z.string(),
    items: z.object({
      type: VariablePrimitive,
    }),
  }),
]);
export const AddQueryRequest = z.object({
  _id: Uuid,
  owner: NilDid,
  name: z.string(),
  schema: Uuid,
  variables: z.record(z.string(), QueryVariableValidator),
  pipeline: z.array(z.record(z.string(), z.unknown())),
});
export type AddQueryRequest = z.infer<typeof AddQueryRequest>;
export type AddQueryResponse = ApiResponse<UuidDto>;

const addQuery: RequestHandler<
  EmptyObject,
  AddQueryResponse,
  AddQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    parseUserData<AddQueryRequest>(() => AddQueryRequest.parse(body)),
    E.flatMap((payload) => QueriesService.addQuery(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const DeleteQueryRequest = z.object({
  id: Uuid,
});
export type DeleteQueryRequest = z.infer<typeof DeleteQueryRequest>;
export type DeleteQueryResponse = ApiResponse<boolean>;

const deleteQuery: RequestHandler<
  EmptyObject,
  DeleteQueryResponse,
  DeleteQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["organization"])) {
    res.sendStatus(401);
    return;
  }
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<DeleteQueryRequest>(() => DeleteQueryRequest.parse(body)),
    E.flatMap((payload) => {
      return QueriesService.removeQuery(ctx, account._id, payload.id);
    }),
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

const executeQuery: RequestHandler<
  EmptyObject,
  ExecuteQueryResponse,
  ExecuteQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["organization"])) {
    res.sendStatus(401);
    return;
  }
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

export const QueriesController = {
  addQuery,
  deleteQuery,
  executeQuery,
  listQueries,
};
