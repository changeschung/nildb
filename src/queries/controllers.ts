import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import { organizationsRemoveQuery } from "#/organizations/repository";
import {
  type QueryDocument,
  queriesDeleteOne,
  queriesFindMany,
} from "#/queries/repository";
import { addQueryToOrganization, executeQuery } from "#/queries/service";

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
  org: Uuid,
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
  const response = await pipe(
    E.try({
      try: () => AddQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => addQueryToOrganization(req.context, body)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export type ListQueriesResponse = ApiResponse<QueryDocument[]>;

export const listQueriesController: RequestHandler<
  EmptyObject,
  ListQueriesResponse,
  EmptyObject
> = async (req, res) => {
  const response = await pipe(
    E.fromNullable(req.user.id),
    E.flatMap((org) => {
      return queriesFindMany(req.context.db.primary, { org });
    }),
    foldToApiResponse(req.context),
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
  const response = await pipe(
    E.try({
      try: () => DeleteQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) =>
      pipe(
        queriesDeleteOne(req.context.db.primary, { _id: request.id }),
        E.flatMap((query) => {
          return organizationsRemoveQuery(
            req.context.db.primary,
            query.org,
            request.id,
          );
        }),
      ),
    ),

    foldToApiResponse(req.context),
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
  const response = await pipe(
    E.try({
      try: () => ExecuteQueryRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((request) => executeQuery(req.context, request)),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
