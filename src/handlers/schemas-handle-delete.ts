import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository } from "#/models";
import { DataRepository } from "#/models/data";
import { SchemasRepository } from "#/models/schemas";
import { Uuid, type UuidDto } from "#/types";

export const DeleteSchemaRequest = z.object({
  id: Uuid,
});
export type DeleteSchemaRequest = { id: UuidDto };

export type DeleteSchemaHandler = Handler<{
  path: "/api/v1/schemas";
  request: DeleteSchemaRequest;
  response: UuidDto;
}>;

export function schemasHandleDelete(
  app: Hono<AppEnv>,
  path: DeleteSchemaHandler["path"],
): void {
  app.delete(path, async (c) => {
    const response: DeleteSchemaHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = DeleteSchemaRequest.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        pipe(
          SchemasRepository.deleteBySchemaId(request.id),
          E.tap((orgId) => {
            return OrganizationsRepository.removeSchemaId(orgId, request.id);
          }),
          E.tap((_orgId) => {
            return DataRepository.deleteCollection(c.var.db.data, request.id);
          }),
        ),
      ),

      E.map((id) => id.toString() as UuidDto),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
