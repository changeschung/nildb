import { Effect as E, Option as O, pipe } from "effect";
import { type Db, type StrictFilter, UUID } from "mongodb";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type QueryVariable = {
  type: "string" | "number" | "boolean";
  description: string;
};

export type QueryBase = DocumentBase & {
  org: UUID;
  name: string;
  // Determines the pipeline's starting collection
  schema: UUID;
  variables: Record<string, QueryVariable>;
  pipeline: Record<string, unknown>[];
};

export const QueriesRepository = {
  create(
    db: Db,
    data: Omit<QueryBase, keyof DocumentBase>,
  ): E.Effect<UUID, DbError> {
    const collection = db.collection<QueryBase>(CollectionName.Queries);
    const now = new Date();
    const document: QueryBase = {
      ...data,
      _id: new UUID(),
      _created: now,
      _updated: now,
    };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.insertOne(document);
        return result.insertedId;
      }),
      succeedOrMapToDbError({
        name: "create",
        params: { document },
      }),
    );
  },

  deleteByQueryId(db: Db, _id: UUID): E.Effect<QueryBase, DbError> {
    const collection = db.collection<QueryBase>(CollectionName.Queries);
    const filter: StrictFilter<QueryBase> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.findOneAndDelete(filter);
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        name: "deleteByQueryId",
        params: { filter },
      }),
    );
  },

  findOrgQueries(db: Db, org: UUID): E.Effect<QueryBase[], DbError> {
    const collection = db.collection<QueryBase>(CollectionName.Queries);
    const filter: StrictFilter<QueryBase> = { org };

    return pipe(
      E.tryPromise(() => {
        return collection.find(filter).toArray();
      }),
      succeedOrMapToDbError({
        name: "findOrgQueries",
        params: { filter },
      }),
    );
  },

  getQueryById(db: Db, _id: UUID): E.Effect<QueryBase, DbError> {
    const collection = db.collection<QueryBase>(CollectionName.Queries);
    const filter: StrictFilter<QueryBase> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const document = await collection.findOne(filter);
        return O.fromNullable(document);
      }),
      succeedOrMapToDbError({
        name: "getQueryById",
        params: { filter },
      }),
    );
  },
} as const;
