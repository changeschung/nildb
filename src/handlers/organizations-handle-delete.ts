import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository } from "#/models";
import { Uuid, type UuidDto } from "#/types";

export const DeleteOrganizationRequestBody = z.object({
  id: Uuid,
});
export type DeleteOrganizationRequestBody = {
  id: UuidDto;
};

export type DeleteOrganizationHandler = Handler<{
  path: "/api/v1/organizations";
  request: DeleteOrganizationRequestBody;
  response: boolean;
}>;

export function organizationsHandleDelete(
  app: Hono<AppEnv>,
  path: DeleteOrganizationHandler["path"],
): void {
  app.delete(path, async (c) => {
    const response: DeleteOrganizationHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = DeleteOrganizationRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap(({ id }) => OrganizationsRepository.deleteById(id)),

      // TODO: delete schemas, queries and data

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
