import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export type SchemaDocument = DocumentBase & {
  owner: NilDid;
  name: string;
  keys: string[];
  schema: Record<string, unknown>;
};

export function schemasInsert(
  ctx: Context,
  document: SchemaDocument,
): E.Effect<UUID, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToRepositoryError({
      op: "schemasInsert",
      params: { document },
    }),
  );
}

export function schemasFindMany(
  ctx: Context,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      return collection.find(filter).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "schemasFindMany",
      filter,
    }),
  );
}

export function schemasFindOne(
  ctx: Context,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.findOne(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "schemasFindOne",
      filter,
    }),
  );
}

export function schemasDeleteMany(
  ctx: Context,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<number, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.deleteMany(filter);
      return result.deletedCount;
    }),
    succeedOrMapToRepositoryError({
      op: "schemasDeleteMany",
      filter,
    }),
  );
}

export function schemasDeleteOne(
  ctx: Context,
  filter: StrictFilter<SchemaDocument>,
): E.Effect<SchemaDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<SchemaDocument>(
        CollectionName.Schemas,
      );
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "schemasDeleteOne",
      filter,
    }),
  );
}
