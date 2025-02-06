import { Effect as E, pipe } from "effect";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { StatusCodes } from "http-status-codes";
import { Temporal } from "temporal-polyfill";
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
              errors: Array.from(error.reason),
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

type ErrorHandler = {
  logMessage: string;
  statusCode: ContentfulStatusCode;
};

type KnownError = {
  _tag: keyof typeof errorHandlers;
};

const errorHandlers: Record<string, ErrorHandler> = {
  DatabaseError: {
    logMessage: "Unknown database error: %O",
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
  },
  SchemaNotFoundError: {
    logMessage: "Schema not found: %O",
    statusCode: StatusCodes.NOT_FOUND,
  },
  IndexNotFoundError: {
    logMessage: "Unknown index %s on schema %s",
    statusCode: StatusCodes.NOT_FOUND,
  },
  ValidationError: {
    logMessage: "Bad request: %O",
    statusCode: StatusCodes.BAD_REQUEST,
  },
} as const;

export function handleTaggedErrors(c: AppContext) {
  return <T, E extends KnownError>(effect: E.Effect<T, E>): E.Effect<T> => {
    type Tags = E["_tag"];

    const handlers: {
      [K in Tags]: (error: Extract<E, { _tag: K }>) => E.Effect<Response>;
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } = {} as any;

    for (const [tag, handler] of Object.entries(errorHandlers)) {
      handlers[tag as Tags] = (e: E) => {
        c.env.log.debug(handler.logMessage, e);
        return E.succeed(
          c.json(
            {
              ts: Temporal.Now.instant().toString(),
              error: [e._tag, ...Object.values(e).filter((v) => v !== e._tag)],
            },
            handler.statusCode,
          ),
        );
      };
    }

    // @ts-ignore
    return pipe(effect, E.catchTags(handlers));
  };
}
