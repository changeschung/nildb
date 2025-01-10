import { ValidationError } from "ajv";
import { Effect as E, pipe } from "effect";
import { UnknownException } from "effect/Cause";
import type { Request, Response } from "express";
import type { JsonArray } from "type-fest";
import { ZodError } from "zod";
import { AppError } from "#/common/app-error";
import { DbError } from "./errors";

export type ApiPath = `/api/v1/${string}`;

export type ApiSuccessResponse<T> = {
  data: T;
};

export type ApiErrorResponse = {
  errors: JsonArray;
  ts: Date;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

type HandlerParams = {
  path: ApiPath;
  request: unknown;
  response: unknown;
};

export type Handler<T extends HandlerParams> = {
  path: T["path"];
  request: T["request"];
  response: ApiResponse<T["response"]>;
};

export function foldToApiResponse<T>(req: Request, res: Response) {
  const { ctx } = req;
  return (effect: E.Effect<T, AppError>): E.Effect<void> =>
    pipe(
      effect,
      E.match({
        onFailure: (error: AppError) => {
          ctx.log.debug("Request failed: %O", error);
          res.send({
            errors: error.reason,
            ts: new Date(),
          });
        },
        onSuccess: (data) => {
          res.send({
            data,
          });
        },
      }),
    );
}

export const transformError = (error: unknown): unknown[] => {
  if (error instanceof ZodError) {
    return [error.flatten()];
  }

  if (error instanceof DbError) {
    return [error.sanitizedMessage()];
  }

  if (error instanceof ValidationError) {
    return error.errors;
  }

  if (error instanceof UnknownException) {
    const cause = error.cause;
    if (typeof cause === "object" && cause && "message" in cause) {
      return [cause.message];
    }
  }

  if (error instanceof AppError) {
    const messages = [];
    let current = error;
    // unwind error messages
    while (current) {
      messages.push(current.message);
      if (current.cause instanceof AppError) {
        current = current.cause;
      } else {
        break;
      }
    }
    return messages;
  }

  return ["An unknown error occurred"];
};
