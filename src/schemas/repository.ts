import { Effect as E, Option as O, pipe } from "effect";
import { type Db, type StrictFilter, UUID } from "mongodb";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type SchemaDocument = DocumentBase & {
  org: UUID;
  name: string;
  keys: string[];
  schema: Record<string, unknown>;
};

export const SchemasRepository = {
  create(
    db: Db,
    data: Omit<SchemaDocument, keyof DocumentBase>,
  ): E.Effect<UUID, DbError> {
    const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
    const now = new Date();
    const document: SchemaDocument = {
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

  deleteBySchemaId(db: Db, _id: UUID): E.Effect<SchemaDocument, DbError> {
    const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
    const filter: StrictFilter<SchemaDocument> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.findOneAndDelete(filter);
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        name: "deleteBySchemaId",
        params: { filter },
      }),
    );
  },

  listOrganizationSchemas(
    db: Db,
    org: UUID,
  ): E.Effect<SchemaDocument[], DbError> {
    const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
    const filter: StrictFilter<SchemaDocument> = { org };

    return pipe(
      E.tryPromise(async () => {
        const results = await collection.find(filter).toArray();
        return O.fromNullable(results);
      }),
      succeedOrMapToDbError({
        name: "listOrganizationSchemas",
        params: { filter },
      }),
    );
  },

  find(db: Db, _id: UUID): E.Effect<SchemaDocument, DbError> {
    const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
    const filter: StrictFilter<SchemaDocument> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.findOne(filter);
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        name: "find",
        params: { filter },
      }),
    );
  },
} as const;
