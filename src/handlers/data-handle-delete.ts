import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { DataRepository } from "#/models/data";
import { Uuid, type UuidDto } from "#/types";

export const DeleteDataRequestBody = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type DeleteDataRequestBody = {
  schema: UuidDto;
  filter: Record<string, unknown>;
};

export type DeleteDataHandler = Handler<{
  path: "/api/v1/data/delete";
  request: DeleteDataRequestBody;
  response: number;
}>;

export function dataHandleDelete(
  app: Hono<AppEnv>,
  path: DeleteDataHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: DeleteDataHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = DeleteDataRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) => {
        if (Object.keys(request.filter).length === 0)
          return E.fail(
            new Error(
              "Filter cannot be empty. Use /data/flush to remove all records from a collection.",
            ),
          );

        return E.succeed(request);
      }),

      E.flatMap((request) =>
        DataRepository.delete(c.var.db.data, request.schema, request.filter),
      ),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
