import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { authenticateUser } from "./service";
import type { ApiResponse } from "#/common/handler";
import { type JwtSerialized, createJwt } from "#/middleware/auth";

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});
export type LoginRequest = z.infer<typeof LoginRequest>;
export type LoginResponse = ApiResponse<JwtSerialized>;

export const loginController: RequestHandler<
  EmptyObject,
  LoginResponse,
  LoginRequest
> = async (req, res) => {
  await pipe(
    E.try({
      try: () => LoginRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) => authenticateUser(body.email, body.password)),

    E.flatMap((user) =>
      E.try({
        try: () =>
          createJwt(
            {
              sub: user._id,
              type: user.type,
            },
            req.context.config.jwtSecret,
          ),
        catch: (error) => new Error("Failed to create Jwt"),
      }),
    ),

    E.match({
      onFailure: () => {
        res.sendStatus(401);
      },
      onSuccess: (token) => {
        res.json({ data: token });
      },
    }),
    E.runPromise,
  );
};
