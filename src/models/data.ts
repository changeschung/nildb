import { Effect as E, pipe } from "effect";
import type { Document, MongoClient, UUID } from "mongodb";
import type { JsonValue } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "./errors";
import { getDataDbName } from "./names";
import type { QueryBase } from "./queries";
import type { SchemaBase } from "./schemas";

type DataContext = {
  schema: SchemaBase;
  client: MongoClient;
};

export const DataRepository = {
  createCollection(
    client: MongoClient,
    schemaId: UUID,
    keys: string[],
  ): E.Effect<UUID, DbError> {
    const collectionName = schemaId.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const collection = client.db().collection(collectionName);

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

  deleteCollection(
    client: MongoClient,
    schemaId: UUID,
  ): E.Effect<boolean, DbError> {
    const collectionName = schemaId.toJSON();
    return pipe(
      E.tryPromise(async () => {
        await client.db().dropCollection(collectionName);
        return true;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "deleteCollection",
        params: { schemaId },
      }),
    );
  },

  insert(
    context: DataContext,
    data: Record<string, unknown>[],
  ): E.Effect<number, DbError> {
    const { client, schema } = context;
    const schemaId = schema._id;
    const collectionName = schemaId.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await client
          .db()
          .collection(collectionName)
          .insertMany(data);

        return result.insertedCount;
      }),
      succeedOrMapToDbError({
        db: getDataDbName(),
        collection: collectionName,
        name: "insert",
        params: { schemaId },
      }),
    );
  },

  delete(context: DataContext, id: UUID): E.Effect<true, DbError> {
    return E.succeed(true);
  },

  runPipeline<T extends JsonValue>(
    client: MongoClient,
    query: QueryBase,
  ): E.Effect<T, DbError> {
    const collectionName = query.schema.toJSON();

    return pipe(
      E.tryPromise(async () => {
        const result = await client
          .db()
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
} as const;
