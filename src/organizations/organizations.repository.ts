import { Effect as E, pipe } from "effect";
import type {
  MongoError,
  StrictFilter,
  StrictUpdateFilter,
  UUID,
} from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import {
  DatabaseError,
  DocumentNotFoundError,
  type PrimaryCollectionNotFoundError,
} from "#/common/errors";
import { CollectionName, checkPrimaryCollectionExists } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";

export function addSchema(
  ctx: AppBindings,
  owner: NilDid,
  schemaId: UUID,
): E.Effect<
  void,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: owner };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $addToSet: { schemas: schemaId },
  };

  return pipe(
    checkPrimaryCollectionExists<OrganizationAccountDocument>(
      ctx,
      CollectionName.Accounts,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.updateOne(filter, update),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
    E.flatMap((result) =>
      result.modifiedCount === 1
        ? E.succeed(void 0)
        : E.fail(new DocumentNotFoundError(CollectionName.Accounts, filter)),
    ),
  );
}

export function removeSchema(
  ctx: AppBindings,
  orgId: NilDid,
  schemaId: UUID,
): E.Effect<
  void,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $pull: { schemas: schemaId },
  };

  return pipe(
    checkPrimaryCollectionExists<OrganizationAccountDocument>(
      ctx,
      CollectionName.Accounts,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.updateOne(filter, update),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
    E.flatMap((result) =>
      result.modifiedCount === 1
        ? E.succeed(void 0)
        : E.fail(new DocumentNotFoundError(CollectionName.Accounts, filter)),
    ),
  );
}

export function addQuery(
  ctx: AppBindings,
  orgId: NilDid,
  queryId: UUID,
): E.Effect<
  void,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $addToSet: { queries: queryId },
  };

  return pipe(
    checkPrimaryCollectionExists<OrganizationAccountDocument>(
      ctx,
      CollectionName.Accounts,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.updateOne(filter, update),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
    E.flatMap((result) =>
      result.modifiedCount === 1
        ? E.succeed(void 0)
        : E.fail(new DocumentNotFoundError(CollectionName.Accounts, filter)),
    ),
  );
}

export function removeQuery(
  ctx: AppBindings,
  orgId: NilDid,
  queryId: UUID,
): E.Effect<
  void,
  DocumentNotFoundError | PrimaryCollectionNotFoundError | DatabaseError
> {
  const filter: StrictFilter<OrganizationAccountDocument> = { _id: orgId };
  const update: StrictUpdateFilter<OrganizationAccountDocument> = {
    $pull: { queries: queryId },
  };

  return pipe(
    checkPrimaryCollectionExists<OrganizationAccountDocument>(
      ctx,
      CollectionName.Accounts,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.updateOne(filter, update),
        catch: (e) => new DatabaseError(e as MongoError),
      }),
    ),
    E.flatMap((result) =>
      result.modifiedCount === 1
        ? E.succeed(void 0)
        : E.fail(new DocumentNotFoundError(CollectionName.Accounts, filter)),
    ),
  );
}
