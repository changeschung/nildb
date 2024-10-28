import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { deleteUserRecord } from "#/models/users";
import { findRootError } from "#/utils";

export const DeleteUserReqBody = z.object({
  email: z.string().email(),
});
export type DeleteUserReqBody = z.infer<typeof DeleteUserReqBody>;

export type DeleteUserPath = "/api/v1/users";

export function handleDeleteUser(
  app: Hono<AppEnv>,
  path: DeleteUserPath,
): void {
  app.delete(path, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return DeleteUserReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ reqBody }) => deleteUserRecord(reqBody.email)),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "delete user", c.var.log);
          return c.text("", status);
        },
        onSuccess: (data) => {
          c.var.log.info(`Deleted users/${data.id}`);
          return c.text("", 200);
        },
      }),
      E.runPromise,
    );
  });
}
