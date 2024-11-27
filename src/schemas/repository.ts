import { randomUUID } from "node:crypto";
import { Effect as E, Option as O, pipe } from "effect";
import { UUID } from "mongodb";
import mongoose from "mongoose";
import type { JsonObject } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type SchemaBase = DocumentBase & {
  org: UUID;
  name: string;
  keys: string[];
  schema: JsonObject;
};

const SchemaDocumentSchema = new mongoose.Schema({
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
  keys: { type: [String] },
  schema: { type: mongoose.Schema.Types.Mixed, required: true },
});

const Model = mongoose.model(CollectionName.Schemas, SchemaDocumentSchema);

export const SchemasRepository = {
  create(data: Omit<SchemaBase, "_id">): E.Effect<UUID, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const document = await Model.create({
          ...data,
          // Mongoose fails if keys is empty; so when no keys then pass `undefined`
          keys: data.keys.length > 0 ? data.keys : undefined,
        });
        return new UUID(document._id);
      }),
      succeedOrMapToDbError({
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
        collection: CollectionName.Schemas,
        name: "find",
        params: { id },
      }),
    );
  },
} as const;
