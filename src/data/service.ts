import { Effect as E, pipe } from "effect";
import { UUID } from "mongodb";
import { ServiceError } from "#/common/error";
import type { ReadDataRequest } from "#/data/controllers";
import { type DataDocument, dataFindMany } from "#/data/repository";
import type { Context } from "#/env";

export function readData(
  ctx: Context,
  request: ReadDataRequest,
): E.Effect<DataDocument[], ServiceError> {
  return pipe(
    E.try({
      try: () => {
        const { schema, filter } = request;
        if ("_id" in filter) {
          const id = filter._id;
          if (typeof id === "string") {
            return {
              schema,
              filter: {
                ...filter,
                _id: new UUID(id),
              },
            };
          }

          if (
            id &&
            typeof id === "object" &&
            "$in" in id &&
            Array.isArray(id.$in)
          ) {
            return {
              schema,
              filter: {
                ...filter,
                _id: { $in: id.$in.map((value) => new UUID(value)) },
              },
            };
          }
        }

        return { schema, filter };
      },
      catch: (cause) => {
        return new ServiceError({
          message: "Failure while converting filter._id to UUID",
          cause,
        });
      },
    }),
    E.flatMap(({ schema, filter }) => dataFindMany(ctx, schema, filter)),
  );
}
