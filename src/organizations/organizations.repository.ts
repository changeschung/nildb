import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, StrictUpdateFilter, UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export function addSchema(
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
      operation: "OrganizationRepository.addSchema",
      filter,
      update,
    }),
  );
}

export function removeSchema(
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
      operation: "OrganizationRepository.removeSchema",
      filter,
      update,
    }),
  );
}

export function addQuery(
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
      operation: "OrganizationRepository.addQuery",
      filter,
      update,
    }),
  );
}

export function removeQuery(
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
      operation: "OrganizationRepository.removeQuery",
      filter,
      update,
    }),
  );
}
