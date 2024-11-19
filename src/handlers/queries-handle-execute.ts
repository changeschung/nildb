import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import type { JsonValue } from "type-fest";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { QueriesRepository } from "#/models";
import { DataRepository } from "#/models/data";
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
        pipe(
          QueriesRepository.getQueryById(request.id),
          E.flatMap((query) => {
            return DataRepository.runPipeline(c.var.db.data, query);
          }),
        ),
      ),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
