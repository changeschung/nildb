import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export type QueryVariable = {
  type: "string" | "number" | "boolean" | "date";
  description: string;
};

export type QueryArrayVariable = {
  type: "array";
  description: string;
  items: {
    type: "string" | "number" | "boolean" | "date";
  };
};

export type QueryDocument = DocumentBase & {
  owner: NilDid;
  name: string;
  // the query's starting collection
  schema: UUID;
  variables: Record<string, QueryVariable | QueryArrayVariable>;
  pipeline: Record<string, unknown>[];
};

function insert(
  ctx: Context,
  document: QueryDocument,
): E.Effect<UUID, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
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
      op: "QueriesRepository.insert",
      document,
    }),
  );
}

function findMany(
  ctx: Context,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
      );
      return collection.find(filter).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "QueriesRepository.findMany",
      filter,
    }),
  );
}

function findOne(
  ctx: Context,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
      );
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "QueriesRepository.findOne",
      filter,
    }),
  );
}

function deleteMany(
  ctx: Context,
  filter: StrictFilter<QueryDocument>,
): E.Effect<number, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
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
      op: "QueriesRepository.deleteMany",
      filter,
    }),
  );
}

function deleteOne(
  ctx: Context,
  filter: StrictFilter<QueryDocument>,
): E.Effect<boolean, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
      );
      const result = await collection.deleteOne(filter);
      return O.fromNullable(result.deletedCount === 1);
    }),
    E.tap(() =>
      E.sync(() => {
        ctx.cache.accounts.taint(filter.owner as NilDid);
      }),
    ),
    succeedOrMapToRepositoryError({
      op: "QueriesRepository.deleteOne",
      filter,
    }),
  );
}

export const QueriesRepository = {
  deleteOne,
  deleteMany,
  findOne,
  findMany,
  insert,
};
