import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { Uuid, type UuidDto } from "#/common/types";
import { isAccountAllowedGuard } from "#/middleware/auth";
import type { QueryDocument } from "./repository";
import { QueriesService } from "./service";

export type ListQueriesResponse = ApiResponse<QueryDocument[]>;

const listQueries: RequestHandler<
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
      return QueriesService.findQueries(req.ctx, owner);
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

const addQuery: RequestHandler<
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
    E.flatMap((body) => QueriesService.addQuery(req.ctx, body)),
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

const deleteQuery: RequestHandler<
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
    E.flatMap((request) => {
      return QueriesService.removeQuery(req.ctx, req.account._id, request.id);
    }),
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

const executeQuery: RequestHandler<
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
      return QueriesService.executeQuery(req.ctx, request);
    }),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const QueriesController = {
  addQuery,
  deleteQuery,
  executeQuery,
  listQueries,
};
