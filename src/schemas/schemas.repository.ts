import { Effect as E, Option as O, pipe } from "effect";
import type {
  Collection,
  CreateIndexesOptions,
  Document,
  IndexSpecification,
  MongoError,
  StrictFilter,
  UUID,
} from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import {
  DatabaseError,
  IndexNotFoundError,
  InvalidIndexOptionsError,
  MongoErrorCode,
  SchemaNotFoundError,
  isMongoError,
  succeedOrMapToRepositoryError,
} from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { UuidDto } from "#/common/types";
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

          if (result.length === 0) {
            return {
              firstWrite: new Date(0),
              lastWrite: new Date(0),
            };
          }

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

export function createIndex(
  ctx: AppBindings,
  schema: UUID,
  specification: IndexSpecification,
  options: CreateIndexesOptions,
): E.Effect<
  string,
  SchemaNotFoundError | InvalidIndexOptionsError | DatabaseError
> {
  return pipe(
    collectionExists(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: async () => collection.createIndex(specification, options),
        catch: (e: unknown) => {
          if (isMongoError(e) && e.code === MongoErrorCode.CannotCreateIndex) {
            return new InvalidIndexOptionsError(e.message);
          }
          return new DatabaseError(e as MongoError);
        },
      }),
    ),
  );
}

export function dropIndex(
  ctx: AppBindings,
  schema: UUID,
  name: string,
): E.Effect<
  Document,
  SchemaNotFoundError | IndexNotFoundError | DatabaseError
> {
  return pipe(
    collectionExists(ctx, schema.toString()),
    E.flatMap((collection) =>
      E.tryPromise({
        try: async () => collection.dropIndex(name),
        catch: (e: unknown) => {
          if (isMongoError(e) && e.code === MongoErrorCode.IndexNotFound) {
            return new IndexNotFoundError(schema.toString(), name);
          }
          return new DatabaseError(e as MongoError);
        },
      }),
    ),
  );
}

function collectionExists<T extends Document>(
  ctx: AppBindings,
  name: string,
): E.Effect<Collection<T>, SchemaNotFoundError | DatabaseError> {
  return pipe(
    E.tryPromise({
      try: () => ctx.db.data.listCollections({ name }).toArray(),
      catch: (e: unknown) => new DatabaseError(e as MongoError),
    }),
    E.flatMap((result) =>
      result.length === 1
        ? E.succeed(ctx.db.data.collection<T>(name))
        : E.fail(new SchemaNotFoundError(name as UuidDto)),
    ),
  );
}
