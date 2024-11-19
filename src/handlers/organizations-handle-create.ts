import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import {
  type OrganizationBase,
  OrganizationsRepository,
} from "#/models/organizations";
import type { UuidDto } from "#/types";

export const CreateOrganizationRequestBody = z.object({
  name: z.string(),
});

export type CreateOrganizationRequestBody = z.infer<
  typeof CreateOrganizationRequestBody
>;

export type CreateOrganizationHandler = Handler<{
  path: "/api/v1/organizations";
  request: Pick<OrganizationBase, "name">;
  response: UuidDto;
}>;

export function organizationsHandleCreate(
  app: Hono<AppEnv>,
  path: CreateOrganizationHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: CreateOrganizationHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = CreateOrganizationRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) => OrganizationsRepository.create(request)),

      E.map((id) => id.toString() as UuidDto),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
