import { Effect as E, pipe } from "effect";
import type { UnknownException } from "effect/Cause";
import type { Document, UUID } from "mongodb";
import type { JsonObject, JsonValue } from "type-fest";
import { z } from "zod";
import type { DbError } from "#/common/errors";
import { validateData } from "#/common/validator";
import { dataRunAggregation } from "#/data/repository";
import type { Context } from "#/env";
import { organizationsAddQuery } from "#/organizations/repository";
import type {
  AddQueryRequest,
  ExecuteQueryRequest,
} from "#/queries/controllers";
import pipelineSchema from "#/queries/mongodb_pipeline.json";
import {
  type QueryArrayVariable,
  type QueryDocument,
  queriesFindOne,
  queriesInsert,
} from "#/queries/repository";

export function addQueryToOrganization(
  ctx: Context,
  request: AddQueryRequest,
): E.Effect<UUID, Error | DbError> {
  return pipe(
    validateData(pipelineSchema, request.pipeline),
    E.flatMap(() => {
      return queriesInsert(ctx, request);
    }),
    E.tap((queryId) => {
      return organizationsAddQuery(ctx, request.owner, queryId);
    }),
  );
}

export function executeQuery(
  ctx: Context,
  request: ExecuteQueryRequest,
): E.Effect<JsonValue, z.ZodError | DbError | Error> {
  return pipe(
    E.Do,
    E.bind("query", () => queriesFindOne(ctx, { _id: request.id })),
    E.bind("variables", ({ query }) =>
      validateVariables(query.variables, request.variables),
    ),
    E.let("pipeline", ({ query, variables }) =>
      injectVariablesIntoAggregation(query.pipeline, variables),
    ),
    E.flatMap(({ query, pipeline }) =>
      dataRunAggregation(ctx, query, pipeline),
    ),
  );
}

export type QueryPrimitive = string | number | boolean | Date;

export type QueryRuntimeVariables = Record<
  string,
  QueryPrimitive | QueryPrimitive[]
>;

function validateVariables(
  template: QueryDocument["variables"],
  provided: ExecuteQueryRequest["variables"],
): E.Effect<QueryRuntimeVariables, z.ZodError | Error | UnknownException> {
  const permittedTypes = ["array", "string", "number", "boolean", "date"];
  const providedKeys = Object.keys(provided);
  const permittedKeys = Object.keys(template);

  if (providedKeys.length !== permittedKeys.length) {
    const error = new Error(
      `Invalid query execution variables, expected: ${JSON.stringify(template)}`,
    );
    return E.fail(error);
  }

  return pipe(
    providedKeys,
    // biome-ignore lint/complexity/noForEach: biome mistake Effect.forEach for conventional for ... each
    E.forEach((key) => {
      const variableTemplate = template[key];

      const type = variableTemplate.type.toLowerCase();
      if (!permittedTypes.includes(type)) {
        return E.fail(new Error(`Unsupported variable type: ${type}`));
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
): E.Effect<QueryPrimitive, z.ZodError | Error> {
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
      return E.fail(new Error(`Unexpected primitive type: ${type}`));
    }
  }

  return result.success ? E.succeed(result.data) : E.fail(result.error);
}

export function injectVariablesIntoAggregation(
  aggregation: Record<string, unknown>[],
  variables: QueryRuntimeVariables,
): Document[] {
  const prefixIdentifier = "##";

  const traverse = (current: unknown): JsonValue => {
    // if item is a string and has prefix identifier then attempt inplace injection
    if (typeof current === "string" && current.startsWith(prefixIdentifier)) {
      const key = current.split(prefixIdentifier)[1];

      if (key in variables) {
        return variables[key] as JsonValue;
      }
      throw new Error(`Missing pipeline variable: ${current}`);
    }

    // if item is an array then traverse each array element
    if (Array.isArray(current)) {
      return current.map((e) => traverse(e));
    }

    // if item is an object then recursively traverse
    if (typeof current === "object" && current !== null) {
      const result: JsonObject = {};
      for (const [key, value] of Object.entries(current)) {
        result[key] = traverse(value);
      }
      return result;
    }

    // remaining types are primitives and therefore do not need traversal
    return current as JsonValue;
  };

  return traverse(aggregation as JsonValue) as Document[];
}
