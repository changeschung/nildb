import { Effect as E, pipe } from "effect";
import type { MongoClient } from "mongodb";
import {
  type FlattenedOrgSchema,
  type OrgDocument,
  OrgDocumentModel,
} from "#/models/orgs";

export function addOrgSchemaRecord(
  orgId: string,
  schemaName: string,
  schema: object,
): E.Effect<OrgDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      OrgDocumentModel.findOneAndUpdate(
        { _id: orgId },
        {
          $set: {
            [`schemas.${schemaName}`]: schema,
          },
        },
      ),
    ),
    E.flatMap((doc) =>
      doc === null
        ? E.fail(new Error(`Failed to find orgs/${orgId}`))
        : E.succeed(doc as OrgDocument),
    ),
    E.mapError(
      (cause) =>
        new Error(`Failed to add orgs/${orgId}/schemas/${schemaName}`, {
          cause,
        }),
    ),
    E.map((result) => result as OrgDocument),
  );
}

export function createOrgSchemaCollection(
  client: MongoClient,
  primaryKeys: string[],
  name: string,
): E.Effect<string, Error> {
  return pipe(
    E.tryPromise(async () => {
      await client.db().createCollection(name);

      const indexes = primaryKeys.map((key) => ({
        key: { [key]: 1 },
        unique: true,
      }));

      return client.db().collection(name).createIndexes(indexes);
    }),
    E.map(() => name),
  );
}

export function removeOrgSchemaRecord(
  orgId: string,
  name: string,
): E.Effect<OrgDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      OrgDocumentModel.findOneAndUpdate(
        { _id: orgId },
        { $unset: { [`schemas.${name}`]: "" } },
      ),
    ),
    E.flatMap((doc) =>
      doc === null
        ? E.fail(new Error(`Failed to remove orgs/${orgId}/schemas/${name}`))
        : E.succeed(doc as OrgDocument),
    ),
    E.mapError(
      (cause) =>
        new Error(`Failed to remove orgs/${orgId}/schemas/${name}`, {
          cause,
        }),
    ),
  );
}

export function removeOrgSchemaCollection(
  client: MongoClient,
  name: string,
): E.Effect<string, Error> {
  return pipe(
    E.tryPromise(async () => {
      const collections = await client
        .db()
        .listCollections({ name }, { nameOnly: true })
        .toArray();

      if (collections.length === 0) {
        throw new Error(`Unknown schema collection: ${name}`);
      }
      return client.db().dropCollection(name);
    }),
    E.flatMap((success) =>
      success
        ? E.succeed(name)
        : E.fail(new Error(`Failed to delete collection/${name}`)),
    ),
    E.mapError((cause) => {
      return new Error(`Failed to delete collection/${name}`, {
        cause,
      });
    }),
  );
}

type SchemaProjection = {
  schemas: Record<string, JsonObject>;
};

export function listOrgSchemas(
  orgId: string,
): E.Effect<Record<SchemaName, JsonObject>, Error> {
  return pipe(
    E.tryPromise(() => {
      return OrgDocumentModel.findById(orgId, {
        schemas: 1,
      }).lean<SchemaProjection>();
    }),
    E.flatMap((doc) =>
      doc?.schemas
        ? E.succeed(doc.schemas)
        : E.fail(new Error(`Failed to find orgs/${orgId}`)),
    ),
    E.mapError((cause) =>
      cause instanceof UnknownException
        ? cause
        : new Error(`Failed to find orgs/${orgId}`, { cause }),
    ),
  );
}

export function findOrgSchemaById(
  orgId: string,
  schemaId: string,
): E.Effect<JsonObject, Error> {
  return pipe(
    E.tryPromise(() => {
      return OrgDocumentModel.findOne(
        {
          _id: orgId,
          [`schemas.${schemaId}`]: { $exists: true },
        },
        {
          [`schemas.${schemaId}`]: 1,
        },
      ).lean<SchemaProjection>();
    }),
    E.flatMap((doc) =>
      doc?.schemas[schemaId]
        ? E.succeed(doc.schemas[schemaId])
        : E.fail(new Error(`Failed to find orgs/${orgId}/schemas/${schemaId}`)),
    ),
    E.mapError((cause) =>
      cause instanceof UnknownException
        ? cause
        : new Error(`Failed to find orgs/${orgId}`, { cause }),
    ),
  );
}

export function insertSchemaData(
  client: MongoClient,
  collection: string,
  data: object[],
): E.Effect<string, Error> {
  return pipe(
    E.tryPromise(() => client.db().collection(collection).insertMany(data)),
    E.map(() => collection),
  );
}
