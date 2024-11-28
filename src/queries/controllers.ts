import Ajv, { ValidationError } from "ajv";
import { Effect as E, pipe } from "effect";
import type { UnknownException } from "effect/Cause";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import { DataRepository, type QueryRuntimeVariables } from "#/data/repository";
import { OrganizationsRepository } from "#/organizations/repository";
import {
  QueriesRepository,
  type QueryDocument,
  type QueryVariable,
} from "#/queries/repository";
import pipelineSchema from "./mongodb_pipeline.json";

export const QueryVariableValidator = z.object({
  type: z.enum(["string", "number", "boolean"]),
  description: z.string(),
});
export const AddQueryRequest = z.object({
  org: Uuid,
  name: z.string(),
  schema: Uuid,
  variables: z.record(z.string(), QueryVariableValidator),
  pipeline: z.array(z.record(z.string(), z.unknown())),
});

export type AddQueryRequest = {
  org: UuidDto;
  name: string;
  schema: UuidDto;
  variables: Record<string, QueryVariable>;
  pipeline: Record<string, unknown>[];
};

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

    E.flatMap((request) => {
      const ajv = new Ajv({ strict: "log" });
      const validator = ajv.compile(pipelineSchema);
      const valid = validator(request.pipeline);

      return valid
        ? E.succeed(request)
        : E.fail(new ValidationError(validator.errors ?? []));
    }),

    E.flatMap((request) =>
      pipe(
        QueriesRepository.create(req.context.db.primary, request),
        E.tap((queryId) => {
          return OrganizationsRepository.addQueryId(
            req.context.db.primary,
            request.org,
            queryId,
          );
        }),
      ),
    ),

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
    E.fromNullable(req.user.sub),
    E.flatMap((org) => {
      return QueriesRepository.findOrgQueries(req.context.db.primary, org);
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
        QueriesRepository.deleteByQueryId(req.context.db.primary, request.id),
        E.flatMap((query) => {
          return OrganizationsRepository.removeQueryId(
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
          QueriesRepository.getQueryById(req.context.db.primary, request.id),
        );
        const variables = yield* _(validateVariables(query, request));
        const result = yield* _(
          DataRepository.runPipeline(req.context.db.data, query, variables),
        );
        return result;
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
      throw new Error("Invalid query execute variables");
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
        default: {
          throw new Error("Invalid query execute variables");
        }
      }
    }
    return variables;
  });
}
