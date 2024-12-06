import { Effect as E, pipe } from "effect";
import { type Db, type Document, type StrictFilter, UUID } from "mongodb";
import {
  type Filter,
  MongoBulkWriteError,
  type UpdateFilter,
} from "mongodb/lib/beta";
import type { JsonObject, JsonValue } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import type { DocumentBase } from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import type { PartialDataDocumentDto } from "#/data/controllers";
import type { QueryDocument } from "#/queries/repository";
import type { SchemaDocument } from "#/schemas/repository";

export function dataCreateCollection(
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
      name: "dataCreateCollection",
      params: { keys, schemaId },
    }),
  );
}

export const TAIL_DATA_LIMIT = 25;

export function dataTailCollection(
  db: Db,
  schema: UUID,
): E.Effect<DataDocument[], DbError> {
  const collection = db.collection<DataDocument>(schema.toString());
  return pipe(
    E.tryPromise(() => {
      return collection
        .find()
        .sort({ _created: -1 })
        .limit(TAIL_DATA_LIMIT)
        .toArray();
    }),
    succeedOrMapToDbError({
      name: "dataTailCollection",
      params: { schema },
    }),
  );
}

export function dataDeleteCollection(
  db: Db,
  schema: UUID,
): E.Effect<boolean, DbError> {
  return pipe(
    E.tryPromise(() => {
      return db.dropCollection(schema.toString());
    }),
    succeedOrMapToDbError({
      name: "dataDeleteCollection",
      params: { schema },
    }),
  );
}

export function dataFlushCollection(
  db: Db,
  schema: UUID,
): E.Effect<number, DbError> {
  const collection = db.collection<DataDocument>(schema.toString());

  return pipe(
    E.tryPromise(async () => {
      const result = await collection.deleteMany();
      return result.deletedCount;
    }),
    succeedOrMapToDbError({
      name: "dataFlushCollection",
      params: { schema },
    }),
  );
}

export type DataDocument<
  T extends Record<string, unknown> = Record<string, unknown>,
> = DocumentBase & T;

export type PartialDataDocument<
  T extends Record<string, unknown> = Record<string, unknown>,
> = Pick<DocumentBase, "_id"> & T;

export type CreateFailure = {
  error: string;
  document: unknown;
};

export type CreatedResult = {
  created: UuidDto[];
  errors: CreateFailure[];
};

export function dataInsert(
  db: Db,
  schema: SchemaDocument,
  data: PartialDataDocumentDto[],
): E.Effect<CreatedResult, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const created = new Set<UuidDto>();
      const errors: CreateFailure[] = [];

      const batchSize = 1000;
      const batches: DataDocument[][] = [];
      const now = new Date();

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((partial) => ({
          ...partial,
          _id: new UUID(partial._id),
          _created: now,
          _updated: now,
        }));
        batches.push(batch);
      }

      const collection = db.collection<DataDocument>(schema._id.toString());

      for (const batch of batches) {
        try {
          const result = await collection.insertMany(batch, {
            ordered: false,
          });
          for (const id of Object.values(result.insertedIds)) {
            created.add(id.toString() as UuidDto);
          }
        } catch (e) {
          if (e instanceof MongoBulkWriteError) {
            const result = e.result;

            for (const id of Object.values(result.insertedIds)) {
              created.add(id.toString() as UuidDto);
            }

            result.getWriteErrors().map((writeError) => {
              const document = batch[writeError.index];
              created.delete(document._id.toString() as UuidDto);
              errors.push({
                error: writeError.errmsg ?? "Unknown bulk operation error",
                document,
              });
            });
          } else {
            console.error("An unhandled error occurred: %O", e);
            throw e;
          }
        }
      }

      return {
        created: Array.from(created),
        errors,
      };
    }),

    succeedOrMapToDbError({
      name: "dataInsert",
      params: { schema: schema._id },
    }),
  );
}

export type UpdateResult = {
  matched: number;
  updated: number;
};

export function dataUpdateMany(
  db: Db,
  schema: UUID,
  filter: Filter<DocumentBase>,
  update: UpdateFilter<DocumentBase>,
): E.Effect<UpdateResult, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<DocumentBase>(schema.toString());
      const result = await collection.updateMany(filter, update);

      return {
        matched: result.matchedCount,
        updated: result.modifiedCount,
      };
    }),
    succeedOrMapToDbError({
      name: "dataUpdateMany",
      params: { schema },
    }),
  );
}

export function dataDeleteMany(
  db: Db,
  schema: UUID,
  filter: StrictFilter<DocumentBase>,
): E.Effect<number, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<DocumentBase>(schema.toString());
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    succeedOrMapToDbError({
      name: "dataDeleteMany",
      params: { schema, filter },
    }),
  );
}

export function dataRunAggregation(
  db: Db,
  query: QueryDocument,
  variables: QueryRuntimeVariables,
): E.Effect<JsonObject[], DbError> {
  return pipe(
    E.tryPromise(() => {
      const pipeline = injectVariablesIntoAggregation(
        query.pipeline,
        variables,
      );
      console.log(pipeline[0]);
      const collection = db.collection<DocumentBase>(query.schema.toString());
      return collection.aggregate(pipeline).toArray();
    }),
    succeedOrMapToDbError({
      name: "dataRunAggregation",
      params: { query: query._id },
    }),
  );
}

export function dataFindMany(
  db: Db,
  schema: UUID,
  filter: Filter<DocumentBase>,
): E.Effect<DataDocument[], DbError> {
  return pipe(
    E.tryPromise(() => {
      const collection = db.collection<DataDocument>(schema.toString());
      return collection.find(filter).sort({ _created: -1 }).toArray();
    }),
    succeedOrMapToDbError({
      name: "dataFindMany",
      params: { schema },
    }),
  );
}

export type QueryRuntimeVariables = Record<
  string,
  string | number | boolean | Date
>;

export function injectVariablesIntoAggregation(
  aggregation: Record<string, unknown>[],
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
  return traverse(aggregation as JsonValue) as Document[];
}
