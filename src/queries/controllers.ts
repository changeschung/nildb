import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { QueryVariableValidator } from "#/admin/controllers";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { enforceQueryOwnership } from "#/common/ownership";
import { Uuid, type UuidDto } from "#/common/types";
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

export const AddQueryRequest = z.object({
  _id: Uuid,
  name: z.string(),
  schema: Uuid,
  variables: z.record(z.string(), QueryVariableValidator),
  pipeline: z.array(z.record(z.string(), z.unknown())),
});
export type AddQueryRequest = z.infer<typeof AddQueryRequest>;
export type AddQueryResponse = ApiResponse<UuidDto>;

export const addQuery: RequestHandler<
  EmptyObject,
  AddQueryResponse,
  AddQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<AddQueryRequest>(() => AddQueryRequest.parse(body)),
    E.flatMap((payload) =>
      QueriesService.addQuery(ctx, {
        ...payload,
        owner: account._id,
      }),
    ),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
