import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository, QueriesRepository } from "#/models";
import { Uuid, type UuidDto } from "#/types";

export const DeleteQueryRequestBody = z.object({
  id: Uuid,
});
export type DeleteQueryRequestBody = {
  id: UuidDto;
};

export type DeleteQueryHandler = Handler<{
  path: "/api/v1/queries";
  request: DeleteQueryRequestBody;
  response: boolean;
}>;

export function queriesHandleDelete(
  app: Hono<AppEnv>,
  path: DeleteQueryHandler["path"],
): void {
  app.delete(path, async (c) => {
    const response = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = DeleteQueryRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        pipe(
          QueriesRepository.deleteByQueryId(request.id),
          E.tap((orgId) => {
            return OrganizationsRepository.removeQueryId(orgId, request.id);
          }),
        ),
      ),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
