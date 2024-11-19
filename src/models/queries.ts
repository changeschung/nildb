import { randomUUID } from "node:crypto";
import { Effect as E, Option as O, pipe } from "effect";
import { UUID } from "mongodb";
import mongoose from "mongoose";
import type { JsonArray, JsonObject } from "type-fest";
import { type DbError, succeedOrMapToDbError } from "#/models/errors";
import { CollectionName, getPrimaryDbName } from "./names";

export type QueryBase = {
  _id: UUID;
  org: UUID;
  name: string;
  // Determines the pipeline's starting collection
  schema: UUID;
  variables: JsonObject;
  pipeline: JsonArray;
};

export const QueryDocumentSchema = new mongoose.Schema(
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
    schema: {
      type: mongoose.Schema.Types.UUID,
      required: true,
      get: (val: Buffer) => new UUID(val),
    },
    variables: { type: Map, required: true },
    pipeline: { type: [mongoose.Schema.Types.Mixed], required: true },
  },
  { timestamps: true },
);

const Model = mongoose.model(CollectionName.Queries, QueryDocumentSchema);

export const QueriesRepository = {
  create(data: Omit<QueryBase, "_id">): E.Effect<UUID, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const document = await Model.create(data);
        return new UUID(document._id);
      }),
      succeedOrMapToDbError({
        name: "create",
        db: getPrimaryDbName(),
        collection: CollectionName.Queries,
        params: { data },
      }),
    );
  },

  deleteByQueryId(id: UUID): E.Effect<UUID, DbError> {
    const filter = { _id: id.toJSON() };

    return pipe(
      E.tryPromise(async () => {
        const document = await Model.findOneAndDelete(filter).lean<QueryBase>({
          virtuals: true,
        });
        return document ? O.some(document.org) : O.none();
      }),
      succeedOrMapToDbError({
        name: "deleteByQueryId",
        db: getPrimaryDbName(),
        collection: CollectionName.Queries,
        params: { filter },
      }),
    );
  },

  findOrgQueries(org: UUID): E.Effect<QueryBase[], DbError> {
    const filter = { org };

    return pipe(
      E.tryPromise(() => {
        return Model.find(filter).lean<QueryBase[]>();
      }),
      succeedOrMapToDbError({
        name: "findOrgQueries",
        db: getPrimaryDbName(),
        collection: CollectionName.Queries,
        params: { filter },
      }),
    );
  },

  getQueryById(_id: UUID): E.Effect<QueryBase, DbError> {
    return pipe(
      E.tryPromise(async () => {
        const document = await Model.findById(_id).lean<QueryBase>();
        return O.fromNullable(document);
      }),
      succeedOrMapToDbError({
        name: "getQueryById",
        db: getPrimaryDbName(),
        collection: CollectionName.Queries,
        params: { _id },
      }),
    );
  },
} as const;
