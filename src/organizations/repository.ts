import { Effect as E, Option as O, pipe } from "effect";
import {
  type Db,
  type StrictFilter,
  type StrictUpdateFilter,
  UUID,
} from "mongodb";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type OrganizationDocument = DocumentBase & {
  name: string;
  schemas: UUID[];
  queries: UUID[];
};

export function organizationsInsert(
  db: Db,
  data: Pick<OrganizationDocument, "name">,
): E.Effect<UUID, DbError> {
  const now = new Date();
  const document: OrganizationDocument = {
    _id: new UUID(),
    _created: now,
    _updated: now,
    schemas: [],
    queries: [],
    name: data.name,
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToDbError({
      name: "organizationsInsert",
      params: { document },
    }),
  );
}

export function organizationsFindMany(
  db: Db,
  filter: StrictFilter<OrganizationDocument>,
): E.Effect<OrganizationDocument[], DbError> {
  return pipe(
    E.tryPromise(() => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      return collection.find(filter).toArray();
    }),
    succeedOrMapToDbError<OrganizationDocument[]>({
      name: "organizationsFindMany",
      params: { filter },
    }),
  );
}

export function organizationsFindOne(
  db: Db,
  filter: StrictFilter<OrganizationDocument>,
): E.Effect<OrganizationDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError<OrganizationDocument>({
      name: "organizationsFindOne",
      params: { filter },
    }),
  );
}

export function organizationsDeleteOne(
  db: Db,
  filter: StrictFilter<OrganizationDocument>,
): E.Effect<OrganizationDocument, DbError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToDbError({
      name: "organizationsDeleteOne",
      params: { filter },
    }),
  );
}

export function organizationsAddSchema(
  db: Db,
  orgId: UUID,
  schemaId: UUID,
): E.Effect<boolean, DbError> {
  const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationDocument> = {
    $addToSet: { schemas: schemaId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToDbError({
      name: "organizationsAddSchema",
      params: { filter, update },
    }),
  );
}

export function organizationsRemoveSchema(
  db: Db,
  orgId: UUID,
  schemaId: UUID,
): E.Effect<boolean, DbError> {
  const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationDocument> = {
    $pull: { schemas: schemaId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToDbError({
      name: "organizationsRemoveSchema",
      params: { filter, update },
    }),
  );
}

export function organizationsAddQuery(
  db: Db,
  orgId: UUID,
  queryId: UUID,
): E.Effect<boolean, DbError> {
  const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationDocument> = {
    $addToSet: { queries: queryId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToDbError({
      name: "organizationsAddQuery",
      params: { filter, update },
    }),
  );
}

export function organizationsRemoveQuery(
  db: Db,
  orgId: UUID,
  queryId: UUID,
): E.Effect<boolean, DbError> {
  const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationDocument> = {
    $pull: { queries: queryId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = db.collection<OrganizationDocument>(
        CollectionName.Organizations,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToDbError({
      name: "organizationsRemoveQuery",
      params: { filter, update },
    }),
  );
}
