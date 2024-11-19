import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import type { EmptyObject } from "type-fest";
import type { AppEnv } from "#/app";
import { SchemasRepository } from "#/models";
import type { SchemaBase } from "#/models/schemas";
import { type Handler, foldToApiResponse } from "./handler";

export type ListSchemasHandler = Handler<{
  path: "/api/v1/schemas";
  request: EmptyObject;
  response: SchemaBase[];
}>;

export function schemasHandleList(
  app: Hono<AppEnv>,
  path: ListSchemasHandler["path"],
): void {
  app.get(path, async (c) => {
    const response: ListSchemasHandler["response"] = await pipe(
      E.fromNullable(c.get("subject")),

      E.flatMap((org) => {
        return SchemasRepository.listOrganizationSchemas(org);
      }),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
