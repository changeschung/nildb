import util from "node:util";
import { Effect as E, Option as O, pipe } from "effect";
import { isUnknownException } from "effect/Cause";
import type { MongoError } from "mongodb";
import { RepositoryError } from "#/common/app-error";

export type DbErrorContext = {
  name: string;
  params: Record<string, unknown>;
  code?: string | number;
  message?: string;
};

export class DbError extends Error {
  readonly _tag = "DbError";

  constructor(
    public readonly context: DbErrorContext,
    public readonly cause?: unknown,
  ) {
    super(`Database operation failed: ${util.inspect(context)}`);
  }

  sanitizedMessage(): string {
    switch (this.context.code) {
      case "11000": {
        return "A similar entry is already in the system";
      }
      case "NotFound": {
        return "We couldn't find what you're looking for";
      }
      default: {
        console.error(this.context.message);
        return "Internal db error";
      }
    }
  }
}

export function succeedOrMapToDbError<T, E extends Error = Error>(
  context: DbErrorContext,
): (effect: E.Effect<T | O.Option<T>, E>) => E.Effect<T, DbError> {
  return (effect) =>
    pipe(
      effect,
      E.flatMap((result) => {
        if (O.isOption(result)) {
          return pipe(
            result,
            O.match({
              onNone: () => {
                context.code = "NotFound";
                return E.fail(new DbError(context));
              },
              onSome: (value) => E.succeed(value),
            }),
          );
        }

        if (!result) {
          return E.fail(new DbError({ ...context }));
        }

        return E.succeed(result as T);
      }),
      E.mapError((cause) => {
        if (cause instanceof DbError) {
          return cause;
        }

        const error = isUnknownException(cause)
          ? (cause.error as Error)
          : cause;

        const errorContext = {
          ...context,
          reason: [error.message],
        };

        if (isMongoError(error)) {
          return new DbError({
            ...errorContext,
            code: String(error.code),
          });
        }

        return new DbError(errorContext, error);
      }),
    );
}

function isMongoError(error: unknown): error is MongoError {
  return error instanceof Error && "code" in error;
}

export function succeedOrMapToRepositoryError<T, E extends Error = Error>(
  context: Record<string, unknown> = {},
): (effect: E.Effect<T | O.Option<T>, E>) => E.Effect<T, RepositoryError> {
  return (effect) =>
    pipe(
      effect,
      E.flatMap((result) => {
        if (O.isOption(result)) {
          return pipe(
            result,
            O.match({
              onNone: () => {
                const error = new RepositoryError({
                  reason: "Document not found",
                  context,
                });
                return E.fail(error);
              },
              onSome: (value) => E.succeed(value),
            }),
          );
        }

        if (!result) {
          return E.fail(
            new RepositoryError({
              reason: "Result is null",
              context,
            }),
          );
        }

        return E.succeed(result as T);
      }),
      E.mapError((cause) => {
        if (cause instanceof RepositoryError) {
          return cause;
        }

        const error = isUnknownException(cause)
          ? (cause.error as Error)
          : cause;

        if (isMongoError(error)) {
          return new RepositoryError({
            reason: [sanitizedMongoDbErrorMessage(error.code)],
            cause: error,
            context: {
              ...context,
              code: String(error.code),
            },
          });
        }

        return new RepositoryError({
          reason: ["Unexpected repository error"],
          cause: error,
          context,
        });
      }),
    );
}

function sanitizedMongoDbErrorMessage(
  code: string | number | undefined,
): string {
  switch (String(code)) {
    case "11000": {
      return "A similar entry is already in the system";
    }
    case "NotFound": {
      return "We couldn't find what you're looking for";
    }
    default: {
      return "Internal db error";
    }
  }
}
