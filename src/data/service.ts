import { Effect as E, pipe } from "effect";
import { UUID } from "mongodb";
import { ServiceError } from "#/common/error";
import type { NilDid } from "#/common/nil-did";
import { validateData } from "#/common/validator";
import type {
  DeleteDataRequest,
  PartialDataDocumentDto,
  ReadDataRequest,
  UpdateDataRequest,
} from "#/data/controllers";
import {
  type CreatedResult,
  type DataDocument,
  DataRepository,
  type UpdateResult,
} from "#/data/repository";
import type { Context } from "#/env";
import { schemasFindOne } from "#/schemas/repository";

function createRecords(
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
      return DataRepository.insert(ctx, document, data);
    }),
    E.mapError((cause) => {
      return new ServiceError({ message: "Failed to create data", cause });
    }),
  );
}

function updateRecords(
  ctx: Context,
  request: UpdateDataRequest,
): E.Effect<UpdateResult, ServiceError> {
  return pipe(
    DataRepository.updateMany(
      ctx,
      request.schema,
      request.filter,
      request.update,
    ),
    E.mapError((cause) => {
      const message = `Update records failed: ${request.schema.toString()}`;
      return new ServiceError({ message, cause });
    }),
  );
}

function readRecords(
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
    E.flatMap(({ schema, filter }) =>
      DataRepository.findMany(ctx, schema, filter),
    ),
  );
}

function deleteRecords(
  ctx: Context,
  request: DeleteDataRequest,
): E.Effect<number, ServiceError> {
  return pipe(
    DataRepository.deleteMany(ctx, request.schema, request.filter),
    E.mapError((cause) => {
      const message = `Delete records failed: ${request.schema.toString()}`;
      return new ServiceError({ message, cause });
    }),
  );
}

function flushCollection(
  ctx: Context,
  schema: UUID,
): E.Effect<number, ServiceError> {
  return pipe(
    DataRepository.flushCollection(ctx, schema),
    E.mapError((cause) => {
      const message = `Flush collection failed: ${schema.toString()}`;
      return new ServiceError({ message, cause });
    }),
  );
}

function tailData(
  ctx: Context,
  schema: UUID,
): E.Effect<DataDocument[], ServiceError> {
  return pipe(
    DataRepository.tailCollection(ctx, schema),
    E.mapError((cause) => {
      const message = `Tail collection failed: ${schema.toString()}`;
      return new ServiceError({ message, cause });
    }),
  );
}

export const DataService = {
  createRecords,
  deleteRecords,
  flushCollection,
  readRecords,
  tailData,
  updateRecords,
};
