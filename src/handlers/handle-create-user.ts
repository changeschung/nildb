import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { createUserRecord } from "#/models/users";
import { findRootError } from "#/utils";

export const CreateUserReqBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  type: z.enum(["admin"]),
});
export type CreateUserReqBody = z.infer<typeof CreateUserReqBody>;

export type CreateUserPath = "/api/v1/users";

export function handleCreateUser(
  app: Hono<AppEnv>,
  path: CreateUserPath,
): void {
  app.post(path, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return CreateUserReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ reqBody }) => createUserRecord(reqBody)),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "create user", c.var.log);
          return c.text("", status);
        },
        onSuccess: (data) => c.json({ data }, 201),
      }),
      E.runPromise,
    );
  });
}
