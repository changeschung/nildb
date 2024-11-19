import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import type { EmptyObject } from "type-fest";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository } from "#/models";
import type { OrganizationBase } from "#/models/organizations";

export type CreateOrganizationHandler = Handler<{
  path: "/api/v1/organizations";
  request: EmptyObject;
  response: OrganizationBase[];
}>;

export function organizationsHandleList(
  app: Hono<AppEnv>,
  path: CreateOrganizationHandler["path"],
): void {
  app.get(path, async (c) => {
    const response: CreateOrganizationHandler["response"] = await pipe(
      OrganizationsRepository.list(),
      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
