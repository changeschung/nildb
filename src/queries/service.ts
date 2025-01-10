import { Effect as E, pipe } from "effect";
import type { Document, UUID } from "mongodb";
import type { JsonObject, JsonValue } from "type-fest";
import { z } from "zod";
import { DataValidationError, ServiceError } from "#/common/app-error";
import type { NilDid } from "#/common/nil-did";
import { validateData } from "#/common/validator";
import { flattenZodError } from "#/common/zod-utils";
import { DataRepository } from "#/data/repository";
import type { Context } from "#/env";
import { OrganizationRepository } from "#/organizations/repository";
import type {
  AddQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/controllers";
import pipelineSchema from "#/queries/mongodb_pipeline.json";
import {
  QueriesRepository,
  type QueryArrayVariable,
  type QueryDocument,
} from "#/queries/repository";

export function addQuery(
  ctx: Context,
  request: AddQueryRequest,
): E.Effect<UUID, ServiceError> {
  return pipe(
    validateData(pipelineSchema, request.pipeline),
    E.flatMap(() => {
      const now = new Date();
      const document: QueryDocument = {
        ...request,
        _created: now,
        _updated: now,
      };
      return QueriesRepository.insert(ctx, document);
    }),
    E.tap((queryId) => {
      return OrganizationRepository.addQuery(ctx, request.owner, queryId);
    }),
    E.mapError((cause) => {
      return new ServiceError({
        reason: ["Add organization query failure"],
        cause,
      });
    }),
  );
}

function executeQuery(
  ctx: Context,
  request: ExecuteQueryRequest,
): E.Effect<JsonValue, DataValidationError | ServiceError> {
  return pipe(
    E.Do,
    E.bind("query", () => QueriesRepository.findOne(ctx, { _id: request.id })),
    E.bind("variables", ({ query }) =>
      validateVariables(query.variables, request.variables),
    ),
    E.bind("pipeline", ({ query, variables }) =>
      injectVariablesIntoAggregation(query.pipeline, variables),
    ),
    E.flatMap(({ query, pipeline }) => {
      return pipe(
        DataRepository.runAggregation(ctx, query, pipeline),
        E.mapError(
          (error) =>
            new ServiceError({
              reason: ["Execute query failed", ...error.reason],
            }),
        ),
      );
    }),
  );
}

function findQueries(
  ctx: Context,
  owner: NilDid,
): E.Effect<QueryDocument[], ServiceError> {
  return pipe(
    QueriesRepository.findMany(ctx, { owner }),
    E.mapError((cause) => {
      return new ServiceError({
        reason: ["Find queries failure"],
        cause,
      });
    }),
  );
}

function removeQuery(
  ctx: Context,
  owner: NilDid,
  _id: UUID,
): E.Effect<boolean, ServiceError> {
  return pipe(
    QueriesRepository.deleteOne(ctx, { owner, _id }),
    E.flatMap((_success) => {
      return OrganizationRepository.removeQuery(ctx, owner, _id);
    }),
    E.mapError((cause) => {
      return new ServiceError({
        reason: ["Remove query failed"],
        cause,
      });
    }),
  );
}

export const QueriesService = {
  addQuery,
  executeQuery,
  findQueries,
  removeQuery,
};

export type QueryPrimitive = string | number | boolean | Date;

export type QueryRuntimeVariables = Record<
  string,
  QueryPrimitive | QueryPrimitive[]
>;

function validateVariables(
  template: QueryDocument["variables"],
  provided: ExecuteQueryRequest["variables"],
): E.Effect<QueryRuntimeVariables, DataValidationError> {
  const permittedTypes = ["array", "string", "number", "boolean", "date"];
  const providedKeys = Object.keys(provided);
  const permittedKeys = Object.keys(template);

  if (providedKeys.length !== permittedKeys.length) {
    const error = new DataValidationError({
      reason: [
        "Query execution variables count mismatch",
        `expected=${permittedKeys.length}, received=${providedKeys.length}`,
      ],
    });
    return E.fail(error);
  }

  return pipe(
    providedKeys,
    // biome-ignore lint/complexity/noForEach: biome mistakes `Effect.forEach` for a conventional `for ... each`
    E.forEach((key) => {
      const variableTemplate = template[key];

      const type = variableTemplate.type.toLowerCase();
      if (!permittedTypes.includes(type)) {
        return E.fail(
          new DataValidationError({
            reason: ["Unsupported type", `type=${type}`],
          }),
        );
      }

      if (type === "array") {
        const itemType = (template[key] as QueryArrayVariable).items.type;
        return pipe(
          provided[key] as unknown[],
          // biome-ignore lint/complexity/noForEach: biome doesn't recognise Effect.forEach
          E.forEach((item) => parsePrimitiveVariable(key, item, itemType)),
          E.map((values) => [key, values] as [string, unknown]),
        );
      }

      return pipe(
        parsePrimitiveVariable(key, provided[key], type),
        E.map((value) => [key, value] as [string, unknown]),
      );
    }),
    E.map((entries) => Object.fromEntries(entries) as QueryRuntimeVariables),
  );
}

function parsePrimitiveVariable(
  key: string,
  value: unknown,
  type: QueryPrimitive,
): E.Effect<QueryPrimitive, DataValidationError> {
  let result:
    | { data: QueryPrimitive; success: true }
    | { success: false; error: z.ZodError };

  switch (type) {
    case "string": {
      result = z.string().safeParse(value, { path: [key] });
      break;
    }
    case "number": {
      result = z.number().safeParse(value, { path: [key] });
      break;
    }
    case "boolean": {
      result = z.boolean().safeParse(value, { path: [key] });
      break;
    }
    case "date": {
      result = z
        .preprocess((arg) => {
          if (arg === null || arg === undefined) return undefined;
          if (typeof arg !== "string") return undefined;
          return new Date(arg);
        }, z.date())
        .safeParse(value, { path: [key] });

      break;
    }
    default: {
      const error = new DataValidationError({
        reason: ["Unsupported type", `type=${type}`],
      });
      return E.fail(error);
    }
  }

  if (result.success) {
    return E.succeed(result.data);
  }

  const error = new DataValidationError({
    reason: flattenZodError(result.error),
  });
  return E.fail(error);
}

export function injectVariablesIntoAggregation(
  aggregation: Record<string, unknown>[],
  variables: QueryRuntimeVariables,
): E.Effect<Document[], ServiceError> {
  const prefixIdentifier = "##";

  const traverse = (current: unknown): E.Effect<JsonValue, ServiceError> => {
    // if item is a string and has prefix identifier then attempt inplace injection
    if (typeof current === "string" && current.startsWith(prefixIdentifier)) {
      const key = current.split(prefixIdentifier)[1];

      if (key in variables) {
        return E.succeed(variables[key] as JsonValue);
      }
      return E.fail(
        new ServiceError({
          reason: ["Missing pipeline variable", current],
        }),
      );
    }

    // if item is an array then traverse each array element
    if (Array.isArray(current)) {
      return E.forEach(current, (e) => traverse(e));
    }

    // if item is an object then recursively traverse it
    if (typeof current === "object" && current !== null) {
      return E.forEach(Object.entries(current), ([key, value]) =>
        pipe(
          traverse(value),
          E.map((traversedValue) => [key, traversedValue] as const),
        ),
      ).pipe(E.map((entries) => Object.fromEntries(entries) as JsonObject));
    }

    // remaining types are primitives and therefore do not need traversal
    return E.succeed(current as JsonValue);
  };

  return traverse(aggregation as JsonValue).pipe(
    E.map((result) => result as Document[]),
  );
}
