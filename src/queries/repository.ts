import { Effect as E, Option as O, pipe } from "effect";
import { type StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/error";
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

export function queriesInsert(
  ctx: Context,
  data: Omit<QueryDocument, keyof DocumentBase>,
): E.Effect<UUID, RepositoryError> {
  const now = new Date();
  const document: QueryDocument = {
    ...data,
    _id: new UUID(),
    _created: now,
    _updated: now,
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<QueryDocument>(
        CollectionName.Queries,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToRepositoryError({
      op: "queriesInsert",
      document,
    }),
  );
}

export function queriesFindMany(
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
      op: "queriesFindMany",
      filter,
    }),
  );
}

export function queriesFindOne(
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
      op: "queriesFindOne",
      filter,
    }),
  );
}

export function queriesDeleteMany(
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
    succeedOrMapToRepositoryError({
      op: "queriesDelete",
      filter,
    }),
  );
}

export function queriesDeleteOne(
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
    succeedOrMapToRepositoryError({
      op: "queriesDelete",
      filter,
    }),
  );
}
