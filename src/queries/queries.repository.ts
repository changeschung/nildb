import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import type { QueryDocument } from "./queries.types";

export function insert(
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

export function findMany(
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

export function findOne(
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

export function deleteMany(
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

export function findOneAndDelete(
  ctx: Context,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
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
      op: "QueriesRepository.findOneAndDelete",
      filter,
    }),
  );
}
