import util from "node:util";
import { Effect as E, Option as O, pipe } from "effect";
import { isUnknownException } from "effect/Cause";
import type { MongoError } from "mongodb";
import type { JsonObject } from "type-fest";

export type DbErrorContext = {
  name: string;
  db: string;
  collection: string;
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
        console.log(this.context.message);
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
          message: error.message,
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
