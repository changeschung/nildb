import { randomUUID } from "node:crypto";
import { Effect as E, Option as O, pipe } from "effect";
import { UUID } from "mongodb";
import mongoose from "mongoose";
import type { JsonObject } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "./errors";
import { CollectionName, getPrimaryDbName } from "./names";

export type SchemaBase = {
  _id: UUID;
  org: UUID;
  name: string;
  keys: string[];
  schema: JsonObject;
};

const SchemaDocumentSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.UUID,
      default: () => randomUUID(),
      get: (val: Buffer) => new UUID(val),
    },
    org: {
      type: mongoose.Schema.Types.UUID,
      required: true,
      get: (val: Buffer) => new UUID(val),
    },
    name: { type: String, required: true },
    keys: { type: [String], default: [] },
    schema: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const Model = mongoose.model(CollectionName.Schemas, SchemaDocumentSchema);

export const SchemasRepository = {
  create(data: Omit<SchemaBase, "_id">): E.Effect<UUID, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const document = await Model.create(data);
        return new UUID(document._id);
      }),
      succeedOrMapToDbError({
        db: getPrimaryDbName(),
        collection: CollectionName.Schemas,
        name: "create",
        params: { data },
      }),
    );
  },

  deleteBySchemaId(id: UUID): E.Effect<UUID, DbError> {
    const filter = { _id: id.toJSON() };

    return pipe(
      E.tryPromise(async () => {
        const document = await Model.findOneAndDelete(filter).lean<SchemaBase>({
          virtuals: true,
        });
        return document ? O.some(document.org) : O.none();
      }),
      succeedOrMapToDbError({
        db: getPrimaryDbName(),
        collection: CollectionName.Schemas,
        name: "deleteBySchemaId",
        params: { filter },
      }),
    );
  },

  listOrganizationSchemas(org: UUID): E.Effect<SchemaBase[], DbError> {
    const filter = { org };

    return pipe(
      E.tryPromise(() => {
        return Model.find(filter).lean<SchemaBase[]>();
      }),
      succeedOrMapToDbError({
        db: getPrimaryDbName(),
        collection: CollectionName.Schemas,
        name: "listOrganizationSchemas",
        params: { filter },
      }),
    );
  },

  find(id: UUID): E.Effect<SchemaBase, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const result = await Model.findById(id).lean<SchemaBase>({
          virtuals: true,
        });
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        db: getPrimaryDbName(),
        collection: CollectionName.Schemas,
        name: "find",
        params: { id },
      }),
    );
  },
} as const;
