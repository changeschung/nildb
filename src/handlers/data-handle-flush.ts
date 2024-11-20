import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { DataRepository } from "#/models/data";
import { Uuid, type UuidDto } from "#/types";

export const FlushDataRequestBody = z.object({
  schema: Uuid,
});
export type FlushDataRequestBody = {
  schema: UuidDto;
};

export type FlushDataHandler = Handler<{
  path: "/api/v1/data/flush";
  request: FlushDataRequestBody;
  response: number;
}>;

export function dataHandleFlush(
  app: Hono<AppEnv>,
  path: FlushDataHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: FlushDataHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = FlushDataRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        DataRepository.flush(c.var.db.data, request.schema),
      ),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
