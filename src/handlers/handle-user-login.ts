import argon2 from "argon2";
import { Effect as E } from "effect";
import type { Hono } from "hono";
import { sign } from "hono/jwt";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { findUserByEmail } from "#/models/users";
import { findRootError } from "#/utils";

export const UserLoginReqBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});
export type UserLoginReqBody = z.infer<typeof UserLoginReqBody>;

export type UserLoginPath = "/api/v1/auth/login";

export function handleUserLogin(app: Hono<AppEnv>, path: UserLoginPath): void {
  app.post(path as UserLoginPath, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return UserLoginReqBody.parse(raw);
        }),
      ),
      E.bind("user", ({ reqBody }) => findUserByEmail(reqBody.email)),
      E.bind("verified", ({ user, reqBody }) =>
        E.tryPromise(() => argon2.verify(user.password, reqBody.password)),
      ),
      E.flatMap(({ user }) =>
        E.tryPromise(
          async () =>
            await sign(
              {
                sub: user.email,
                // In tests verification fails because iat === now(), so subtract 1s
                iat: Math.round(Date.now() / 1000) - 1,
                type: user.type,
              },
              c.env.jwtSecret,
            ),
        ),
      ),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "login failed", c.var.log);
          return c.text("", status);
        },
        onSuccess: (token) => c.json({ token }),
      }),
      E.runPromise,
    );
  });
}
