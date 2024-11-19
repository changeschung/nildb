import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { UsersRepository } from "#/models";
import type { UserBase } from "#/models/users";
import type { UuidDto } from "#/types";
import { type Handler, foldToApiResponse } from "./handler";

export const CreateUserRequestBody = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  type: z.enum(["admin"]),
});
export type CreateUserRequestBody = z.infer<typeof CreateUserRequestBody>;

export type CreateUserHandler = Handler<{
  path: "/api/v1/users";
  request: Omit<UserBase, "_id">;
  response: UuidDto;
}>;

export function usersHandleCreate(
  app: Hono<AppEnv>,
  path: CreateUserHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: CreateUserHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = CreateUserRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((data) => UsersRepository.create(data)),

      E.map((id) => id.toString() as UuidDto),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
