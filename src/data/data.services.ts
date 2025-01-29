import { Effect as E, pipe } from "effect";
import { UUID } from "mongodb";
import { type DataValidationError, ServiceError } from "#/common/app-error";
import { validateData } from "#/common/validator";
import type { AppBindings } from "#/env";
import * as SchemasRepository from "#/schemas/schemas.repository";
import type {
  DataDocument,
  UpdateResult,
  UploadResult,
} from "./data.repository";
import * as DataRepository from "./data.repository";
import type {
  DeleteDataRequest,
  PartialDataDocumentDto,
  ReadDataRequest,
  UpdateDataRequest,
} from "./data.types";

export function createRecords(
  ctx: AppBindings,
  schemaId: UUID,
  data: Record<string, unknown>[],
): E.Effect<UploadResult, DataValidationError | ServiceError> {
  return pipe(
    E.Do,
    E.bind("document", () => {
      return SchemasRepository.findOne(ctx, {
        _id: schemaId,
      });
    }),
    E.bind("data", ({ document }) => {
      return validateData<PartialDataDocumentDto[]>(document.schema, data);
    }),
    E.flatMap(({ document, data }) => {
      return pipe(
        DataRepository.insert(ctx, document, data),
        E.mapError(
          (error) =>
            new ServiceError({
              reason: ["Create records failed", ...error.reason],
            }),
        ),
      );
    }),
  );
}

export function updateRecords(
  ctx: AppBindings,
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
      const reason = ["Update records failed", request.schema.toString()];
      return new ServiceError({ reason, cause });
    }),
  );
}

export function readRecords(
  ctx: AppBindings,
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
          reason: ["Failure converting filter._id to UUID"],
          cause,
        });
      },
    }),
    E.flatMap(({ schema, filter }) =>
      DataRepository.findMany(ctx, schema, filter),
    ),
  );
}

export function deleteRecords(
  ctx: AppBindings,
  request: DeleteDataRequest,
): E.Effect<number, ServiceError> {
  return pipe(
    DataRepository.deleteMany(ctx, request.schema, request.filter),
    E.mapError((cause) => {
      const reason = [`Delete records failed: ${request.schema.toString()}`];
      return new ServiceError({ reason, cause });
    }),
  );
}

export function flushCollection(
  ctx: AppBindings,
  schema: UUID,
): E.Effect<number, ServiceError> {
  return pipe(
    DataRepository.flushCollection(ctx, schema),
    E.mapError((cause) => {
      const reason = ["Flush collection failed", schema.toString()];
      return new ServiceError({ reason, cause });
    }),
  );
}

export function tailData(
  ctx: AppBindings,
  schema: UUID,
): E.Effect<DataDocument[], ServiceError> {
  return pipe(
    DataRepository.tailCollection(ctx, schema),
    E.mapError((cause) => {
      const reason = ["Tail collection failed", schema.toString()];
      return new ServiceError({ reason, cause });
    }),
  );
}
