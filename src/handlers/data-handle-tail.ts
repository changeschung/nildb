import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import type { JsonArray } from "type-fest";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { DataRepository } from "#/models/data";
import { Uuid, type UuidDto } from "#/types";

export const TailDataRequestBody = z.object({
  schema: Uuid,
});
export type TailDataRequestBody = {
  schema: UuidDto;
};

export type TailDataHandler = Handler<{
  path: "/api/v1/data/tail";
  request: TailDataRequestBody;
  response: JsonArray;
}>;

export function dataHandleTail(
  app: Hono<AppEnv>,
  path: TailDataHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: TailDataHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = TailDataRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        DataRepository.tail(c.var.db.data, request.schema),
      ),

      E.map((data) => data as JsonArray),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
