import { randomUUID } from "node:crypto";
import { Effect as E, Option as O, pipe } from "effect";
import { UUID } from "mongodb";
import mongoose, { type FilterQuery } from "mongoose";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type OrganizationBase = DocumentBase & {
  schemas: UUID[];
  queries: UUID[];
  name: string;
};

export const OrganizationDocumentSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.UUID,
      default: () => randomUUID(),
      get: (val: Buffer) => new UUID(val),
    },
    schemas: {
      type: [
        {
          type: mongoose.Schema.Types.UUID,
          get: (val: Buffer) => new UUID(val),
        },
      ],
      default: [],
    },
    queries: {
      type: [
        {
          type: mongoose.Schema.Types.UUID,
          get: (val: Buffer) => new UUID(val),
        },
      ],
      default: [],
    },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

const Model = mongoose.model(
  CollectionName.Organizations,
  OrganizationDocumentSchema,
);

export const OrganizationsRepository = {
  create(data: Pick<OrganizationBase, "name">): E.Effect<UUID, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const document = await Model.create({
          name: data.name,
        });
        return new UUID(document.id);
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "create",
        params: { data },
      }),
    );
  },

  list(): E.Effect<OrganizationBase[], DbError> {
    const filter: FilterQuery<OrganizationBase> = {};

    return pipe(
      E.tryPromise(() => {
        return Model.find(filter).lean<OrganizationBase[]>();
      }),
      succeedOrMapToDbError<OrganizationBase[]>({
        collection: CollectionName.Organizations,
        name: "list",
        params: { filter },
      }),
    );
  },

  findById(_id: UUID): E.Effect<OrganizationBase, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const result = await Model.findById(_id).lean<OrganizationBase>();
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError<OrganizationBase>({
        collection: CollectionName.Organizations,
        name: "findById",
        params: { _id },
      }),
    );
  },

  deleteById(_id: UUID): E.Effect<boolean, DbError> {
    const filter = { _id };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.deleteOne(filter);
        return result.deletedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "deleteById",
        params: { filter },
      }),
    );
  },

  addSchemaId(orgId: UUID, schemaId: UUID): E.Effect<boolean, DbError> {
    const filter = { _id: orgId };
    // For this to be serialised as a binary UUID it needs to be passed as a string
    const update = { $addToSet: { schemas: schemaId.toString() } };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "addSchemaId",
        params: { filter, update },
      }),
    );
  },

  removeSchemaId(orgId: UUID, schemaId: UUID): E.Effect<boolean, DbError> {
    const filter = { _id: orgId };
    const update = { $pull: { schemas: schemaId } };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "removeSchemaId",
        params: { filter, update },
      }),
    );
  },

  addQueryId(orgId: UUID, queryId: UUID): E.Effect<boolean, DbError> {
    const filter = { _id: orgId };
    // For this to be serialised as a binary UUID it needs to be passed as a string
    const update = { $addToSet: { queries: queryId.toString() } };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "addQueryId",
        params: { filter, update },
      }),
    );
  },

  removeQueryId(orgId: UUID, queryId: UUID): E.Effect<boolean, DbError> {
    const filter = { _id: orgId };
    const update = { $pull: { queries: queryId } };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.updateOne(filter, update);
        return result.modifiedCount === 1 ? O.some(true) : O.none();
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Organizations,
        name: "removeQueryId",
        params: { filter, update },
      }),
    );
  },
} as const;
