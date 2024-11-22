import { Effect as E, pipe } from "effect";
import type { UnknownException } from "effect/Cause";
import type { Hono } from "hono";
import type { JsonValue } from "type-fest";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { QueriesRepository } from "#/models";
import { DataRepository, type QueryRuntimeVariables } from "#/models/data";
import type { QueryBase } from "#/models/queries";
import { Uuid, type UuidDto } from "#/types";

export const ExecuteQueryRequestBody = z.object({
  id: Uuid,
  variables: z.record(z.string(), z.unknown()),
});
export type ExecuteQueryRequestBody = {
  id: UuidDto;
  variables: Record<string, unknown>;
};

export type ExecuteQueryHandler = Handler<{
  path: "/api/v1/queries/execute";
  request: ExecuteQueryRequestBody;
  response: JsonValue;
}>;

export function queriesHandleExecute(
  app: Hono<AppEnv>,
  path: ExecuteQueryHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: ExecuteQueryHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = ExecuteQueryRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        E.gen(function* (_) {
          const query = yield* _(QueriesRepository.getQueryById(request.id));
          const variables = yield* _(validateVariables(query, request));
          const result = yield* _(
            DataRepository.runPipeline(c.var.db.data, query, variables),
          );
          return result;
        }),
      ),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}

function validateVariables(
  query: QueryBase,
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
