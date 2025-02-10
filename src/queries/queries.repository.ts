import { Effect as E, pipe } from "effect";
import type { StrictFilter } from "mongodb";
import {
  DatabaseError,
  DocumentNotFoundError,
  type PrimaryCollectionNotFoundError,
} from "#/common/errors";
import { CollectionName, checkPrimaryCollectionExists } from "#/common/mongo";
import type { AppBindings } from "#/env";
import type { QueryDocument } from "./queries.types";

export function insert(
  ctx: AppBindings,
  document: QueryDocument,
): E.Effect<void, PrimaryCollectionNotFoundError | DatabaseError> {
  return pipe(
    checkPrimaryCollectionExists<QueryDocument>(ctx, CollectionName.Queries),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.insertOne(document),
        catch: (cause) => new DatabaseError({ cause, message: "insert" }),
      }),
    ),
    E.as(void 0),
  );
}

export function findMany(
  ctx: AppBindings,
  filter: StrictFilter<QueryDocument>,
): E.Effect<
  QueryDocument[],
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  return pipe(
    checkPrimaryCollectionExists<QueryDocument>(ctx, CollectionName.Queries),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.find(filter).toArray(),
        catch: (cause) => new DatabaseError({ cause, message: "findMany" }),
      }),
    ),
    E.flatMap((result) =>
      result === null
        ? E.fail(
            new DocumentNotFoundError({
              collection: CollectionName.Schemas,
              filter,
            }),
          )
        : E.succeed(result),
    ),
  );
}

export function findOne(
  ctx: AppBindings,
  filter: StrictFilter<QueryDocument>,
): E.Effect<
  QueryDocument,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  return pipe(
    checkPrimaryCollectionExists<QueryDocument>(ctx, CollectionName.Queries),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.findOne(filter),
        catch: (cause) => new DatabaseError({ cause, message: "findOne" }),
      }),
    ),
    E.flatMap((result) =>
      result === null
        ? E.fail(
            new DocumentNotFoundError({
              collection: CollectionName.Schemas,
              filter,
            }),
          )
        : E.succeed(result),
    ),
  );
}

export function findOneAndDelete(
  ctx: AppBindings,
  filter: StrictFilter<QueryDocument>,
): E.Effect<
  QueryDocument,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  return pipe(
    checkPrimaryCollectionExists<QueryDocument>(ctx, CollectionName.Queries),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.findOneAndDelete(filter),
        catch: (cause) =>
          new DatabaseError({ cause, message: "findOneAndDelete" }),
      }),
    ),
    E.flatMap((result) =>
      result === null
        ? E.fail(
            new DocumentNotFoundError({
              collection: CollectionName.Schemas,
              filter,
            }),
          )
        : E.succeed(result),
    ),
  );
}
