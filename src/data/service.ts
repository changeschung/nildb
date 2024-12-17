import { Effect as E, pipe } from "effect";
import { UUID } from "mongodb";
import { ServiceError } from "#/common/error";
import type { NilDid } from "#/common/nil-did";
import { validateData } from "#/common/validator";
import type {
  PartialDataDocumentDto,
  ReadDataRequest,
} from "#/data/controllers";
import {
  type CreatedResult,
  type DataDocument,
  dataFindMany,
  dataInsert,
} from "#/data/repository";
import type { Context } from "#/env";
import { schemasFindOne } from "#/schemas/repository";

export function createDataService(
  ctx: Context,
  ownerId: NilDid,
  schemaId: UUID,
  data: Record<string, unknown>[],
): E.Effect<CreatedResult, ServiceError> {
  return pipe(
    E.Do,
    E.bind("document", () => {
      return schemasFindOne(ctx, {
        _id: schemaId,
        owner: ownerId,
      });
    }),
    E.bind("data", ({ document }) => {
      return validateData<PartialDataDocumentDto[]>(document.schema, data);
    }),
    E.flatMap(({ document, data }) => {
      return dataInsert(ctx, document, data);
    }),
    E.mapError((cause) => {
      return new ServiceError({ message: "Failed to create data", cause });
    }),
  );
}

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
