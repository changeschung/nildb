import { Effect as E, pipe } from "effect";
import type { Db, Document, UUID } from "mongodb";
import type { JsonArray, JsonObject, JsonValue } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import type { QueryBase } from "#/queries/repository";
import type { SchemaBase } from "#/schemas/repository";
import { DocumentBase } from "#/common/mongo";
import { UuidDto } from "#/common/types";

export type QueryRuntimeVariables = Record<string, string | number | boolean>;

export type CreatedResult = {
  created: UuidDto[];
  errors: CreateFailure[];
};

export type CreateFailure = {
  error: string;
  data: unknown;
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

        // _id is a key by default so we remove to avoid the collision
        const keysWithOutId = keys.filter((key) => key !== "_id");
        if (keysWithOutId.length > 0) {
          await collection.createIndex(keysWithOutId, { unique: true });
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
    data: DocumentBase[],
  ): E.Effect<CreatedResult, DbError> {
    const collectionName = schema._id.toString();

    return pipe(
      E.tryPromise(async () => {
        const created = new Set<UuidDto>();
        const errors: CreateFailure[] = [];

        // TODO using a bulk write or concurrently is trickier than anticipated
        //  going for simple solution until I have time to come back to this
        const now = new Date();

        const promises = data.map(async (d) => {
          const id = d._id.toString() as UuidDto;
          try {
            const doc: Document = {
              ...d,
              _created: now,
              _updated: now,
            };

            const result = await db.collection(collectionName).insertOne(doc);

            if (result.acknowledged) {
              created.add(id);
            } else {
              errors.push({
                error: "Failed to insert document",
                data: doc,
              });
            }
          } catch (error) {
            console.error(error);
            errors.push({
              error: "Unhandled error occurred",
              data: d,
            });
          }
        });
        await Promise.all(promises);

        return {
          created: Array.from(created),
          errors,
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
