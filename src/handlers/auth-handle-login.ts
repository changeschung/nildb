import argon2 from "argon2";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { sign } from "hono/jwt";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { createJwt } from "#/handlers/auth-middleware";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { UsersRepository } from "#/models";

export const UserLoginRequestBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});
export type UserLoginRequestBody = z.infer<typeof UserLoginRequestBody>;

export type AuthLoginHandler = Handler<{
  path: "/api/v1/auth/login";
  request: UserLoginRequestBody;
  response: string;
}>;

export function authHandleLogin(
  app: Hono<AppEnv>,
  path: AuthLoginHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: AuthLoginHandler["response"] = await pipe(
      E.Do,
      E.bind("data", () => E.tryPromise(() => c.req.json<unknown>())),
      E.bind("request", ({ data }) => {
        const result = UserLoginRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),
      E.bind("user", ({ request }) =>
        UsersRepository.findByEmail(request.email),
      ),
      E.bind("verified", ({ user, request }) =>
        E.tryPromise(() => argon2.verify(user.password, request.password)),
      ),
      E.flatMap(({ user }) =>
        E.tryPromise(() =>
          createJwt(
            {
              sub: user._id,
              type: user.type,
            },
            c.env.jwtSecret,
          ),
        ),
      ),
      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
