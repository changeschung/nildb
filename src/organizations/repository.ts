import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, StrictUpdateFilter, UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import type { RepositoryError } from "#/common/error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export function organizationsAddSchema(
  ctx: Context,
  owner: NilDid,
  schemaId: UUID,
): E.Effect<boolean, RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: owner };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $addToSet: { schemas: schemaId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToRepositoryError({
      operation: "organizationsAddSchema",
      filter,
      update,
    }),
  );
}

export function organizationsRemoveSchema(
  ctx: Context,
  orgId: NilDid,
  schemaId: UUID,
): E.Effect<boolean, RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $pull: { schemas: schemaId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToRepositoryError({
      operation: "organizationsRemoveSchema",
      filter,
      update,
    }),
  );
}

export function organizationsAddQuery(
  ctx: Context,
  orgId: NilDid,
  queryId: UUID,
): E.Effect<boolean, RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $addToSet: { queries: queryId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToRepositoryError({
      operation: "organizationsAddQuery",
      filter,
      update,
    }),
  );
}

export function organizationsRemoveQuery(
  ctx: Context,
  orgId: NilDid,
  queryId: UUID,
): E.Effect<boolean, RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $pull: { queries: queryId },
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.updateOne(filter, update);
      return result.modifiedCount === 1 ? O.some(true) : O.none();
    }),
    succeedOrMapToRepositoryError({
      operation: "organizationsRemoveQuery",
      filter,
      update,
    }),
  );
}
