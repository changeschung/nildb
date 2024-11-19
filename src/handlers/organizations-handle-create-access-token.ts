import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import {
  type JwtPayload,
  type SerializedJwt,
  createJwt,
} from "#/handlers/auth-middleware";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository } from "#/models";
import { Uuid, type UuidDto } from "#/types";

export const CreateOrganizationAccessTokenRequestBody = z.object({
  id: Uuid,
});
export type CreateOrganizationAccessTokenRequestBody = { id: UuidDto };

export type CreateOrganizationAccessTokenHandler = Handler<{
  path: "/api/v1/organizations/access-tokens";
  request: CreateOrganizationAccessTokenRequestBody;
  response: SerializedJwt;
}>;

export function organizationsHandleCreateAccessToken(
  app: Hono<AppEnv>,
  path: CreateOrganizationAccessTokenHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: CreateOrganizationAccessTokenHandler["response"] =
      await pipe(
        E.tryPromise(() => c.req.json<unknown>()),

        E.flatMap((data) => {
          const result =
            CreateOrganizationAccessTokenRequestBody.safeParse(data);
          return result.success ? E.succeed(result.data) : E.fail(result.error);
        }),

        E.flatMap((request) => OrganizationsRepository.findById(request.id)),

        E.flatMap((record) =>
          E.tryPromise(() => {
            const payload: Partial<JwtPayload> = {
              sub: record._id,
              type: "access-token",
            };
            return createJwt(payload, c.env.jwtSecret);
          }),
        ),

        foldToApiResponse<SerializedJwt>(c),
        E.runPromise,
      );

    return c.json(response);
  });
}
