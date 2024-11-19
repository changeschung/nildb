import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { UsersRepository } from "#/models";

export const DeleteUserRequestBody = z.object({
  email: z.string().email(),
});
export type DeleteUserRequestBody = z.infer<typeof DeleteUserRequestBody>;

export type DeleteUserHandler = Handler<{
  path: "/api/v1/users";
  request: DeleteUserRequestBody;
  response: boolean;
}>;

export function usersHandleDelete(
  app: Hono<AppEnv>,
  path: DeleteUserHandler["path"],
): void {
  app.delete(path, async (c) => {
    const response: DeleteUserHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = DeleteUserRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap(({ email }) => UsersRepository.delete(email)),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
