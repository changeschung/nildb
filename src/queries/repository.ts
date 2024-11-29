import { Effect as E, Option as O, pipe } from "effect";
import { type Db, type StrictFilter, UUID } from "mongodb";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type QueryVariable = {
  type: "string" | "number" | "boolean";
  description: string;
};

export type QueryDocument = DocumentBase & {
  org: UUID;
  name: string;
  // Defines the pipeline's starting collection
  schema: UUID;
  variables: Record<string, QueryVariable>;
  pipeline: Record<string, unknown>[];
};

export function queriesInsert(
  db: Db,
  data: Omit<QueryDocument, keyof DocumentBase>,
): E.Effect<UUID, DbError> {
  const now = new Date();
  const document: QueryDocument = {
    ...data,
    _id: new UUID(),
    _created: now,
    _updated: now,
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<QueryDocument>(CollectionName.Queries);
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToDbError({
      name: "queriesInsert",
      params: { document },
    }),
  );
}

export function queriesFindMany(
  db: Db,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument[], DbError> {
  return pipe(
    E.tryPromise(() => {
      const collection = db.collection<QueryDocument>(CollectionName.Queries);
      return collection.find(filter).toArray();
    }),
    succeedOrMapToDbError({
      name: "queriesFindMany",
      params: { filter },
    }),
  );
}

export function queriesFindOne(
  db: Db,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<QueryDocument>(CollectionName.Queries);
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError({
      name: "queriesFindOne",
      params: { filter },
    }),
  );
}

export function queriesDeleteMany(
  db: Db,
  filter: StrictFilter<QueryDocument>,
): E.Effect<number, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<QueryDocument>(CollectionName.Queries);
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    succeedOrMapToDbError({
      name: "queriesDelete",
      params: { filter },
    }),
  );
}

export function queriesDeleteOne(
  db: Db,
  filter: StrictFilter<QueryDocument>,
): E.Effect<QueryDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<QueryDocument>(CollectionName.Queries);
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError({
      name: "queriesDelete",
      params: { filter },
    }),
  );
}
