import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { Uuid, type UuidDto } from "#/common/types";
import { isAccountAllowedGuard } from "#/middleware/auth";
import { OrganizationRepository } from "#/organizations/repository";
import {
  type QueryDocument,
  queriesDeleteOne,
  queriesFindMany,
} from "#/queries/repository";
import { addQueryToOrganization, executeQuery } from "#/queries/service";

export type ListQueriesResponse = ApiResponse<QueryDocument[]>;

export const listQueriesController: RequestHandler<
  EmptyObject,
  ListQueriesResponse,
  EmptyObject
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.fromNullable(req.account._id),
    E.flatMap((owner) => {
      return queriesFindMany(req.ctx, { owner });
    }),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
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

export const addQueryController: RequestHandler<
  EmptyObject,
  AddQueryResponse,
  AddQueryRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => AddQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => addQueryToOrganization(req.ctx, body)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteQueryRequest = z.object({
  id: Uuid,
});
export type DeleteQueryRequest = z.infer<typeof DeleteQueryRequest>;
export type DeleteQueryResponse = ApiResponse<boolean>;

export const deleteQueryController: RequestHandler<
  EmptyObject,
  DeleteQueryResponse,
  DeleteQueryRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => DeleteQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) =>
      pipe(
        queriesDeleteOne(req.ctx, { _id: request.id }),
        E.flatMap((query) => {
          return OrganizationRepository.removeQuery(
            req.ctx,
            query.owner,
            request.id,
          );
        }),
      ),
    ),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const ExecuteQueryRequest = z.object({
  id: Uuid,
  variables: z.record(z.string(), z.unknown()),
});
export type ExecuteQueryRequest = z.infer<typeof ExecuteQueryRequest>;
export type ExecuteQueryResponse = ApiResponse<JsonValue>;

export const executeQueryController: RequestHandler<
  EmptyObject,
  ExecuteQueryResponse,
  ExecuteQueryRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => ExecuteQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((request) => {
      return executeQuery(req.ctx, request);
    }),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};
