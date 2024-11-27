import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { UuidDto } from "#/common/types";
import { Repository } from "./repository";

export const CreateUserRequest = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  type: z.enum(["admin"]),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;
export type CreateUserResponse = ApiResponse<UuidDto>;

export const createUserController: RequestHandler<
  EmptyObject,
  CreateUserResponse,
  CreateUserRequest
> = async (req, res) => {
  const response: CreateUserResponse = await pipe(
    E.try({
      try: () => CreateUserRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((data) => Repository.create(data)),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteUserRequest = z.object({
  email: z.string().email(),
});
export type DeleteUserRequest = z.infer<typeof DeleteUserRequest>;
export type DeleteUserResponse = ApiResponse<boolean>;

export const deleteUserController: RequestHandler = async (req, res) => {
  const response: DeleteUserResponse = await pipe(
    E.try({
      try: () => DeleteUserRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap(({ email }) => Repository.delete(email)),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
