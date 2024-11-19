import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { UUID } from "mongodb";
import type { EmptyObject } from "type-fest";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { QueriesRepository } from "#/models";
import type { QueryBase } from "#/models/queries";

export type ListQueriesHandler = Handler<{
  path: "/api/v1/queries";
  request: EmptyObject;
  response: QueryBase[];
}>;

export function queriesHandleList(
  app: Hono<AppEnv>,
  path: ListQueriesHandler["path"],
): void {
  app.get(path, async (c) => {
    const response: ListQueriesHandler["response"] = await pipe(
      E.try(() => c.get("subject")),

      E.map((id) => new UUID(id)),

      E.flatMap((org) => QueriesRepository.findOrgQueries(org)),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
