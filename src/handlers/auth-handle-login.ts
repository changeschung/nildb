import argon2 from "argon2";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
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
  app.post(path, (c) => {
    return pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = UserLoginRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) =>
        pipe(
          UsersRepository.findByEmail(request.email),
          E.flatMap((user) =>
            E.tryPromise(async () => {
              const valid = await argon2.verify(
                user.password,
                request.password,
              );

              if (!valid) throw new Error("Unauthorized");

              return user;
            }),
          ),
        ),
      ),

      E.flatMap((user) =>
        E.tryPromise(() => {
          return createJwt(
            {
              sub: user._id,
              type: user.type,
            },
            c.env.jwtSecret,
          );
        }),
      ),

      E.match({
        onFailure: () => {
          return c.text("Unauthorized", 401);
        },
        onSuccess: (token) => {
          return c.json({ data: token });
        },
      }),

      E.runPromise,
    );
  });
}
