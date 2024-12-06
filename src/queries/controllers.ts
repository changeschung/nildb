import { Effect as E, pipe } from "effect";
import type { UnknownException } from "effect/Cause";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import {
  type QueryRuntimeVariables,
  dataRunAggregation,
} from "#/data/repository";
import { organizationsRemoveQuery } from "#/organizations/repository";
import {
  type QueryDocument,
  queriesDeleteOne,
  queriesFindMany,
  queriesFindOne,
} from "#/queries/repository";
import { addQueryToOrganization } from "#/queries/service";

export const QueryVariableValidator = z.object({
  type: z.enum(["string", "number", "boolean", "date"]),
  description: z.string(),
});
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
export type DeleteQueryRequest = {
  id: UuidDto;
};
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
export type ExecuteQueryRequest = {
  id: UuidDto;
  variables: Record<string, unknown>;
};
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

    E.flatMap((request) =>
      E.gen(function* (_) {
        const query = yield* _(
          queriesFindOne(req.context.db.primary, { _id: request.id }),
        );
        const variables = yield* _(validateVariables(query, request));
        return yield* _(
          dataRunAggregation(req.context.db.data, query, variables),
        );
      }),
    ),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

function validateVariables(
  query: QueryDocument,
  request: { variables: Record<string, unknown> },
): E.Effect<QueryRuntimeVariables, UnknownException> {
  return E.try(() => {
    const provided = Object.keys(request.variables);
    const permitted = Object.keys(query.variables);

    if (provided.length !== permitted.length) {
      throw new Error(
        `Invalid query execution variables, expected: ${JSON.stringify(query.variables)}`,
      );
    }

    const variables: QueryRuntimeVariables = {};

    for (const key of provided) {
      const { type } = query.variables[key];
      const value = request.variables[key];

      switch (type) {
        case "string": {
          variables[key] = z.string().parse(value, { path: [key] });
          break;
        }
        case "number": {
          variables[key] = z.number().parse(value, { path: [key] });
          break;
        }
        case "boolean": {
          variables[key] = z.boolean().parse(value, { path: [key] });
          break;
        }
        case "date": {
          variables[key] = z.coerce.date().parse(value, { path: [key] });
          break;
        }
        default: {
          throw new Error("Invalid query execute variables");
        }
      }
    }
    return variables;
  });
}
