import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export type SchemaDocument = DocumentBase & {
  owner: NilDid;
  name: string;
  keys: string[];
  schema: Record<string, unknown>;
};

function insert(
  ctx: Context,
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
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.insert",
      document,
    }),
  );
}

function findMany(
  ctx: Context,
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

function findOne(
  ctx: Context,
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

function deleteMany(
  ctx: Context,
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
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.deleteMany",
      filter,
    }),
  );
}

function deleteOne(
  ctx: Context,
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
    succeedOrMapToRepositoryError({
      op: "SchemasRepository.deleteOne",
      filter,
    }),
  );
}

export const SchemasRepository = {
  deleteMany,
  deleteOne,
  findMany,
  findOne,
  insert,
};
