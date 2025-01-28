import { Effect as E, pipe } from "effect";
import { type Document, type StrictFilter, UUID } from "mongodb";
import {
  type Filter,
  MongoBulkWriteError,
  type UpdateFilter,
} from "mongodb/lib/beta";
import type { JsonObject } from "type-fest";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import type { DocumentBase } from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import type { Context } from "#/env";
import type { QueryDocument } from "#/queries/queries.types";
import type { SchemaDocument } from "#/schemas/schemas.repository";
import type { PartialDataDocumentDto } from "./data.types";

export function createCollection(
  ctx: Context,
  schemaId: UUID,
  keys: string[],
): E.Effect<UUID, RepositoryError> {
  const collectionName = schemaId.toJSON();

  return pipe(
    E.tryPromise(async () => {
      const collection = await ctx.db.data.createCollection(collectionName);

      // _id is a key by default so we remove to avoid the collision
      const keysWithOutId = keys.filter((key) => key !== "_id");
      if (keysWithOutId.length > 0) {
        await collection.createIndex(keysWithOutId, { unique: true });
      }

      return schemaId;
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.createCollection",
      keys,
      schemaId,
    }),
  );
}

export const TAIL_DATA_LIMIT = 25;

export function tailCollection(
  ctx: Context,
  schema: UUID,
): E.Effect<DataDocument[], RepositoryError> {
  const collection = ctx.db.data.collection<DataDocument>(schema.toString());
  return pipe(
    E.tryPromise(() => {
      return collection
        .find()
        .sort({ _created: -1 })
        .limit(TAIL_DATA_LIMIT)
        .toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.tailCollection",
      schema,
    }),
  );
}

export function deleteCollection(
  ctx: Context,
  schema: UUID,
): E.Effect<boolean, RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      return ctx.db.data.dropCollection(schema.toString());
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.deleteCollection",
      schema,
    }),
  );
}

export function flushCollection(
  ctx: Context,
  schema: UUID,
): E.Effect<number, RepositoryError> {
  const collection = ctx.db.data.collection<DataDocument>(schema.toString());

  return pipe(
    E.tryPromise(async () => {
      const result = await collection.deleteMany();
      return result.deletedCount;
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.flushCollection",
      schema,
    }),
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
  ctx: Context,
  schema: SchemaDocument,
  data: PartialDataDocumentDto[],
): E.Effect<UploadResult, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
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

      const collection = ctx.db.data.collection<DataDocument>(
        schema._id.toString(),
      );

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
    }),

    succeedOrMapToRepositoryError({
      op: "DataRepository.insert",
      schema: schema._id,
    }),
  );
}

export type UpdateResult = {
  matched: number;
  updated: number;
};

export function updateMany(
  ctx: Context,
  schema: UUID,
  filter: Filter<DocumentBase>,
  update: UpdateFilter<DocumentBase>,
): E.Effect<UpdateResult, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.data.collection<DocumentBase>(
        schema.toString(),
      );
      const result = await collection.updateMany(filter, update);

      return {
        matched: result.matchedCount,
        updated: result.modifiedCount,
      };
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.updateMany",
      schema,
    }),
  );
}

export function deleteMany(
  ctx: Context,
  schema: UUID,
  filter: StrictFilter<DocumentBase>,
): E.Effect<number, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.data.collection<DocumentBase>(
        schema.toString(),
      );
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.deleteMany",
      schema,
      filter,
    }),
  );
}

export function runAggregation(
  ctx: Context,
  query: QueryDocument,
  pipeline: Document[],
): E.Effect<JsonObject[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      return ctx.db.data
        .collection<DocumentBase>(query.schema.toString())
        .aggregate(pipeline)
        .toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.runAggregation",
      query: query._id,
    }),
  );
}

export function findMany(
  ctx: Context,
  schema: UUID,
  filter: Filter<DocumentBase>,
): E.Effect<DataDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      const collection = ctx.db.data.collection<DataDocument>(
        schema.toString(),
      );
      return collection.find(filter).sort({ _created: -1 }).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.findMany",
      schema,
    }),
  );
}
