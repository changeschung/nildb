import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import type { JsonArray } from "type-fest";
import type { AppError } from "#/common/app-error";
import type { AppContext } from "#/env";

export type ApiSuccessResponse<T> = {
  data: T;
};

export type ApiErrorResponse = {
  errors: JsonArray;
  ts: Date;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function foldToApiResponse<T>(c: AppContext) {
  return (effect: E.Effect<T, AppError>): E.Effect<Response> =>
    pipe(
      effect,
      E.match({
        onFailure: (error: AppError) => {
          c.env.log.debug("Request failed: %O", error);
          return c.json(
            {
              errors: error.reason,
              ts: new Date(),
            },
            StatusCodes.BAD_REQUEST,
          );
        },
        onSuccess: (data) => {
          return c.json({
            data,
          });
        },
      }),
    );
}
