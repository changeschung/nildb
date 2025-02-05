import { Effect as E, Option as O, pipe } from "effect";
import type { MongoError, StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import {
  DatabaseError,
  type SchemaNotFoundError,
  succeedOrMapToRepositoryError,
} from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";
import type { SchemaMetadata } from "#/schemas/schemas.types";

export type SchemaDocument = DocumentBase & {
  owner: NilDid;
  name: string;
  schema: Record<string, unknown>;
};

export function insert(
  ctx: AppBindings,
  document: SchemaDocument,
): E.Effect<UUID, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    E.tap(() =>
      E.sync(() => {
        ctx.cache.accounts.taint(document.owner);
      }),
    ),
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.insert",
      document,
    }),
  );
}

export function findMany(
  ctx: AppBindings,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      return collection.find(filter).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.findMany",
      filter,
    }),
  );
}

export function findOne(
  ctx: AppBindings,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.findOne",
      filter,
    }),
  );
}

export function deleteMany(
  ctx: AppBindings,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<number, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    E.tap(() =>
      E.sync(() => {
        ctx.cache.accounts.taint(filter.owner as NilDid);
      }),
    ),
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.deleteMany",
      filter,
    }),
  );
}

export function deleteOne(
  ctx: AppBindings,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    E.tap(() =>
      E.sync(() => {
        ctx.cache.accounts.taint(filter.owner as NilDid);
      }),
    ),
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.deleteOne",
      filter,
    }),
  );
}

export function getCollectionStats(
  ctx: AppBindings,
  id: UUID,
): E.Effect<SchemaMetadata, SchemaNotFoundError | DatabaseError> {
  const collection = ctx.db.data.collection(id.toString());

  return E.Do.pipe(
    E.bind("timeStats", () =>
      E.tryPromise({
        try: async () => {
          const result = await collection
            .aggregate([
              {
                $group: {
                  _id: null,
                  firstWrite: { $min: "$_created" },
                  lastWrite: { $max: "$_created" },
                },
              },
            ])
            .toArray();

          const { firstWrite, lastWrite } = result[0];

          return {
            firstWrite,
            lastWrite,
          };
        },
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),
    E.bind("indexes", () =>
      E.tryPromise({
        try: async () => {
          const result = await collection.indexes();
          const indexes = result.map((index) => ({
            v: index.v ?? -1,
            key: index.key,
            name: index.name ?? "",
            unique: index.unique ?? false,
          }));

          return indexes;
        },
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),
    E.bind("counts", () =>
      E.tryPromise({
        try: async () => {
          type CollStats = { count: number; size: number };
          const result = await collection
            .aggregate<CollStats>([
              {
                $collStats: {
                  storageStats: {},
                },
              },
              {
                $project: {
                  count: "$storageStats.count",
                  size: "$storageStats.size",
                },
              },
            ])
            .toArray();
          const stats = result[0];

          return {
            count: stats.count,
            size: stats.size,
          };
        },
        catch: (e: unknown) => new DatabaseError(e as MongoError),
      }),
    ),

    E.map(({ timeStats, indexes, counts }) => {
      return {
        id,
        ...timeStats,
        ...counts,
        indexes,
      };
    }),
  );
}
