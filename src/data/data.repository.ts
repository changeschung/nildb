import { Effect as E, pipe } from "effect";
import {
  type DeleteResult,
  type Document,
  type MongoError,
  type StrictFilter,
  UUID,
  type UpdateResult,
} from "mongodb";
import {
  type Filter,
  MongoBulkWriteError,
  type UpdateFilter,
} from "mongodb/lib/beta";
import type { JsonObject } from "type-fest";
import {
  type DataCollectionNotFoundError,
  DatabaseError,
  InvalidIndexOptionsError,
} from "#/common/errors";
import {
  type DocumentBase,
  MongoErrorCode,
  checkDataCollectionExists,
  isMongoError,
} from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import type { AppBindings } from "#/env";
import type { QueryDocument } from "#/queries/queries.types";
import type { SchemaDocument } from "#/schemas/schemas.repository";
import type { PartialDataDocumentDto } from "./data.types";

export function createCollection(
  ctx: AppBindings,
  schemaId: UUID,
): E.Effect<void, InvalidIndexOptionsError | DatabaseError> {
  return pipe(
    E.tryPromise({
      try: () => ctx.db.data.createCollection(schemaId.toString()),
      catch: (e) => new DatabaseError(e as MongoError),
    }),
    E.flatMap((collection) =>
      E.all([
        E.tryPromise({
          try: () =>
            collection.createIndex(
              { _updated: 1 },
              { unique: false, name: "_updated_1" },
            ),
          catch: (e) => {
            if (isMongoError(e) && e.code === MongoErrorCode.IndexNotFound) {
              return new InvalidIndexOptionsError(
                schemaId.toString(),
                "_updated_1",
              );
            }
            return new DatabaseError(e as MongoError);
          },
        }),
        E.tryPromise({
          try: () =>
            collection.createIndex(
              { _created: 1 },
              { unique: false, name: "_created_1" },
            ),
          catch: (e) => {
            if (isMongoError(e) && e.code === MongoErrorCode.IndexNotFound) {
              return new InvalidIndexOptionsError(
                schemaId.toString(),
                "_created_1",
              );
            }
            return new DatabaseError(e as MongoError);
          },
        }),
      ]),
    ),
    E.as(void 0),
  );
}

export const TAIL_DATA_LIMIT = 25;

export function tailCollection(
  ctx: AppBindings,
  schema: UUID,
): E.Effect<DataDocument[], DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DataDocument>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () =>
          collection
            .find()
            .sort({ _created: -1 })
            .limit(TAIL_DATA_LIMIT)
            .toArray(),
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export function deleteCollection(
  ctx: AppBindings,
  schema: UUID,
): E.Effect<void, DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DataDocument>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => ctx.db.data.dropCollection(collection.collectionName),
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),
    E.as(void 0),
  );
}

export function flushCollection(
  ctx: AppBindings,
  schema: UUID,
): E.Effect<DeleteResult, DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DataDocument>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.deleteMany(),
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export type DataDocument<
  T extends Record<string, unknown> = Record<string, unknown>,
> = DocumentBase & T;

export type CreateFailure = {
  error: string;
  document: unknown;
};

export type UploadResult = {
  created: UuidDto[];
  errors: CreateFailure[];
};

export function insert(
  ctx: AppBindings,
  schema: SchemaDocument,
  data: PartialDataDocumentDto[],
): E.Effect<UploadResult, DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DataDocument>(ctx, schema._id.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: async () => {
          const created = new Set<UuidDto>();
          const errors: CreateFailure[] = [];

          const batchSize = 1000;
          const batches: DataDocument[][] = [];
          const now = new Date();

          for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize).map((partial) => ({
              ...partial,
              _id: new UUID(partial._id),
              _created: now,
              _updated: now,
            }));
            batches.push(batch);
          }

          for (const batch of batches) {
            try {
              const result = await collection.insertMany(batch, {
                ordered: false,
              });
              for (const id of Object.values(result.insertedIds)) {
                created.add(id.toString() as UuidDto);
              }
            } catch (e) {
              if (e instanceof MongoBulkWriteError) {
                const result = e.result;

                for (const id of Object.values(result.insertedIds)) {
                  created.add(id.toString() as UuidDto);
                }

                result.getWriteErrors().map((writeError) => {
                  const document = batch[writeError.index];
                  created.delete(document._id.toString() as UuidDto);
                  errors.push({
                    error: writeError.errmsg ?? "Unknown bulk operation error",
                    document,
                  });
                });
              } else {
                console.error("An unhandled error occurred: %O", e);
                throw e;
              }
            }
          }

          return {
            created: Array.from(created),
            errors,
          };
        },
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export function updateMany(
  ctx: AppBindings,
  schema: UUID,
  filter: Filter<DocumentBase>,
  update: UpdateFilter<DocumentBase>,
): E.Effect<UpdateResult, DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DocumentBase>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () =>
          collection.updateMany(
            coerceIdToUuid<Filter<DocumentBase>>(filter),
            update,
          ),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export function deleteMany(
  ctx: AppBindings,
  schema: UUID,
  filter: StrictFilter<DocumentBase>,
): E.Effect<DeleteResult, DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DocumentBase>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () =>
          collection.deleteMany(coerceIdToUuid<Filter<DocumentBase>>(filter)),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export function runAggregation(
  ctx: AppBindings,
  query: QueryDocument,
  pipeline: Document[],
): E.Effect<JsonObject[], DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DocumentBase>(ctx, query.schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.aggregate(pipeline).toArray(),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

export function findMany(
  ctx: AppBindings,
  schema: UUID,
  filter: Filter<DocumentBase>,
): E.Effect<DataDocument[], DataCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkDataCollectionExists<DocumentBase>(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.find(filter).sort({ _created: -1 }).toArray(),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
  );
}

function coerceIdToUuid<T>(value: Record<string, unknown>): T {
  const next = {
    ...value,
  };

  if ("_id" in value && value._id && typeof value._id === "string") {
    next._id = new UUID(value._id);
  }

  return next as unknown as T;
}
