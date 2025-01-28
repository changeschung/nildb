import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";

export type SchemaDocument = DocumentBase & {
  owner: NilDid;
  name: string;
  keys: string[];
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
