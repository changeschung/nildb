import { Effect as E, pipe } from "effect";
import type { Db, Document, UUID } from "mongodb";
import type { JsonValue } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "./errors";
import { getDataDbName } from "./names";
import type { QueryBase } from "./queries";

export const DataRepository = {
  createCollection(
    db: Db,
    schemaId: UUID,
    keys: string[],
  ): E.Effect<UUID, DbError> {
    const collectionName = schemaId.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const collection = await db.createCollection(collectionName);

        if (keys.length > 0) {
          await collection.createIndex(keys, { unique: true });
        }

        return schemaId;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "createCollection",
        params: { keys, schemaId },
      }),
    );
  },

  deleteCollection(db: Db, schema: UUID): E.Effect<boolean, DbError> {
    const collectionName = schema.toJSON();
    return pipe(
      E.tryPromise(async () => {
        await db.dropCollection(collectionName);
        return true;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "deleteCollection",
        params: { schema },
      }),
    );
  },

  insert(
    db: Db,
    schema: UUID,
    data: Record<string, unknown>[],
  ): E.Effect<number, DbError> {
    const collectionName = schema.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await db.collection(collectionName).insertMany(
          data.map((doc) => ({
            ...doc,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );

        return result.insertedCount;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "insert",
        params: { collectionName },
      }),
    );
  },

  delete(
    db: Db,
    schema: UUID,
    filter: Record<string, unknown>,
  ): E.Effect<number, DbError> {
    const collectionName = schema.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await db.collection(collectionName).deleteMany(filter);
        return result.deletedCount;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "delete",
        params: { collectionName, filter },
      }),
    );
  },

  flush(db: Db, schema: UUID): E.Effect<number, DbError> {
    const collectionName = schema.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await db.collection(collectionName).deleteMany({});
        return result.deletedCount;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "flush",
        params: { collectionName },
      }),
    );
  },

  runPipeline<T extends JsonValue>(
    db: Db,
    query: QueryBase,
  ): E.Effect<T, DbError> {
    const collectionName = query.schema.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await db
          .collection(collectionName)
          .aggregate(query.pipeline as Document[])
          .toArray();

        return result as unknown as T;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "runPipeline",
        params: {},
      }),
    );
  },

  tail<T extends JsonValue>(db: Db, schema: UUID): E.Effect<T, DbError> {
    const collectionName = schema.toJSON();
    return pipe(
      E.tryPromise(async () => {
        const result = await db
          .collection(collectionName)
          .find({})
          .sort({ createdAt: -1 })
          .limit(25)
          .project({
            _id: 0,
          })
          .toArray();

        return result as unknown as T;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "tail",
        params: { schema },
      }),
    );
  },
} as const;
