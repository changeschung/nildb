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

export function schemasInsert(
  db: Db,
  data: Omit<SchemaDocument, keyof DocumentBase>,
): E.Effect<UUID, DbError> {
  const now = new Date();
  const document: SchemaDocument = {
    ...data,
    _id: new UUID(),
    _created: now,
    _updated: now,
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToDbError({
      name: "schemasInsert",
      params: { document },
    }),
  );
}

export function schemasFindMany(
  db: Db,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument[], DbError> {
  return pipe(
    E.tryPromise(() => {
      const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
      return collection.find(filter).toArray();
    }),
    succeedOrMapToDbError({
      name: "schemasFindMany",
      params: { filter },
    }),
  );
}

export function schemasFindOne(
  db: Db,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError({
      name: "schemasFindOne",
      params: { filter },
    }),
  );
}

export function schemasDeleteMany(
  db: Db,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<number, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    succeedOrMapToDbError({
      name: "schemasDeleteMany",
      params: { filter },
    }),
  );
}

export function schemasDeleteOne(
  db: Db,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<SchemaDocument>(CollectionName.Schemas);
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError({
      name: "schemasDeleteOne",
      params: { filter },
    }),
  );
}
