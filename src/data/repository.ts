import { Effect as E, pipe } from "effect";
import type { Db, Document, UUID } from "mongodb";
import type { JsonArray, JsonObject, JsonValue } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import type { QueryBase } from "#/queries/repository";
import type { SchemaBase } from "#/schemas/repository";

export type QueryRuntimeVariables = Record<string, string | number | boolean>;

export type InsertResult = {
  created: number;
  updated: number;
  errors: number;
};

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

        const idDropped = { ...keys, _id: undefined };
        if (idDropped.length > 0) {
          await collection.createIndex(keys, { unique: true });
        }

        return schemaId;
      }),
      succeedOrMapToDbError({
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
        collection: collectionName,
        name: "deleteCollection",
        params: { schema },
      }),
    );
  },

  insert(
    db: Db,
    schema: SchemaBase,
    data: Record<string, unknown>[],
  ): E.Effect<InsertResult, DbError> {
    const collectionName = schema._id.toString();
    const now = new Date();

    return pipe(
      E.tryPromise(async () => {
        const bulk = db.collection(collectionName).initializeUnorderedBulkOp();

        for (const element of data) {
          const filter: Record<string, unknown> = {};

          for (const key of schema.keys) {
            filter[key] = element[key];
          }

          bulk
            .find(filter)
            .upsert()
            .replaceOne({
              ...element,
              createdAt: { $setOnInsert: now },
              updatedAt: now,
            });
        }

        const result = await bulk.execute();

        return {
          created: result.upsertedCount,
          updated: result.modifiedCount,
          errors: result.getWriteErrorCount(),
        };
      }),

      succeedOrMapToDbError({
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
        collection: collectionName,
        name: "flush",
        params: { collectionName },
      }),
    );
  },

  runPipeline<T extends JsonValue>(
    db: Db,
    query: QueryBase,
    variables: QueryRuntimeVariables,
  ): E.Effect<T, DbError> {
    const collectionName = query.schema.toJSON();
    const pipeline = injectVariables(query.pipeline, variables);

    return pipe(
      E.tryPromise(async () => {
        const result = await db
          .collection(collectionName)
          .aggregate(pipeline)
          .toArray();

        return result as unknown as T;
      }),
      succeedOrMapToDbError({
        collection: collectionName,
        name: "runPipeline",
        params: { pipeline },
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
        collection: collectionName,
        name: "tail",
        params: { schema },
      }),
    );
  },
} as const;

export function injectVariables(
  pipeline: JsonArray,
  variables: QueryRuntimeVariables,
): Document[] {
  const prefixIdentifier = "##";
  const traverse = (current: JsonValue): JsonValue => {
    if (typeof current === "string" && current.startsWith(prefixIdentifier)) {
      const key = current.split(prefixIdentifier)[1];

      if (key in variables) {
        return variables[key] as JsonValue;
      }
      throw new Error(`Missing pipeline variable: ${current}`);
    }

    if (Array.isArray(current)) {
      return current.map((e) => traverse(e));
    }

    if (typeof current === "object" && current !== null) {
      const result: JsonObject = {};
      for (const [key, value] of Object.entries(current)) {
        result[key] = traverse(value);
      }
      return result;
    }

    return current;
  };
  return traverse(pipeline) as Document[];
}
