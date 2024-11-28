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

export const OrganizationsRepository = {
  create(
    db: Db,
    data: Pick<OrganizationDocument, "name">,
  ): E.Effect<UUID, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const now = new Date();
    const document: OrganizationDocument = {
      ...data,
      schemas: [],
      queries: [],
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

  list(db: Db): E.Effect<OrganizationDocument[], DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = {};

    return pipe(
      E.tryPromise(() => {
        return collection.find(filter).toArray();
      }),
      succeedOrMapToDbError<OrganizationDocument[]>({
        name: "list",
        params: { filter },
      }),
    );
  },

  findById(db: Db, _id: UUID): E.Effect<OrganizationDocument, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.findOne(filter);
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError<OrganizationDocument>({
        name: "findById",
        params: { filter },
      }),
    );
  },

  deleteById(db: Db, _id: UUID): E.Effect<UUID, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.deleteOne(filter);
        return result.deletedCount === 1 ? O.some(_id) : O.none();
      }),
      succeedOrMapToDbError({
        name: "deleteById",
        params: { filter },
      }),
    );
  },

  addSchemaId(db: Db, orgId: UUID, schemaId: UUID): E.Effect<boolean, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
    const update: StrictUpdateFilter<OrganizationDocument> = {
      $addToSet: { schemas: schemaId },
    };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        name: "addSchemaId",
        params: { filter, update },
      }),
    );
  },

  removeSchemaId(
    db: Db,
    orgId: UUID,
    schemaId: UUID,
  ): E.Effect<boolean, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
    const update: StrictUpdateFilter<OrganizationDocument> = {
      $pull: { schemas: schemaId },
    };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        name: "removeSchemaId",
        params: { filter, update },
      }),
    );
  },

  addQueryId(db: Db, orgId: UUID, queryId: UUID): E.Effect<boolean, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
    const update: StrictUpdateFilter<OrganizationDocument> = {
      $addToSet: { queries: queryId },
    };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        name: "addQueryId",
        params: { filter, update },
      }),
    );
  },

  removeQueryId(
    db: Db,
    orgId: UUID,
    queryId: UUID,
  ): E.Effect<boolean, DbError> {
    const collection = db.collection<OrganizationDocument>(
      CollectionName.Organizations,
    );
    const filter: StrictFilter<OrganizationDocument> = { _id: orgId };
    const update: StrictUpdateFilter<OrganizationDocument> = {
      $pull: { queries: queryId },
    };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        name: "removeQueryId",
        params: { filter, update },
      }),
    );
  },
} as const;
