import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import type { RegisterAccountRequest } from "./controllers";

export type OrganizationAccountDocument = {
  _id: NilDid;
  _type: "organization";
  _created: Date;
  _updated: Date;
  publicKey: string;
  name: string;
  subscription: {
    active: boolean;
  };
  schemas: UUID[];
  queries: UUID[];
};

export function toOrganizationAccountDocument(
  data: RegisterAccountRequest,
  env: "mainnet" | "testnet",
): OrganizationAccountDocument {
  const { did, publicKey, name } = data;
  const now = new Date();

  return {
    _id: did,
    _type: "organization",
    _created: now,
    _updated: now,
    publicKey,
    name,
    subscription: {
      // testnet subscriptions default to active
      active: env === "testnet",
    },
    schemas: [],
    queries: [],
  };
}

export function insert(
  ctx: Context,
  document: OrganizationAccountDocument,
): E.Effect<NilDid, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToRepositoryError({
      op: "AccountRepository.insert",
      document,
    }),
  );
}

export function findOne(
  ctx: Context,
  filter: StrictFilter<OrganizationAccountDocument>,
): E.Effect<OrganizationAccountDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const accountsCache = ctx.cache.accounts;
      filter._type = "organization";

      // Try cache to avoid db query
      if (filter._id) {
        const account = accountsCache.get(filter._id as NilDid);
        if (account && account._type === "organization") {
          return O.some(account);
        }
      }

      // Cache miss search database
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.findOne(filter);

      if (result) {
        accountsCache.set(result._id, result);
      }

      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "AccountRepository.findOne",
      filter,
    }),
  );
}

export function deleteOneById(
  ctx: Context,
  _id: NilDid,
): E.Effect<NilDid, RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = {
    _id,
    _type: "organization",
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.deleteOne(filter);
      return result.deletedCount === 1 ? O.some(_id) : O.none();
    }),
    E.tap(() =>
      E.sync(() => {
        ctx.cache.accounts.delete(_id);
      }),
    ),
    succeedOrMapToRepositoryError({
      name: "AccountRepository.deleteOne",
      filter,
    }),
  );
}

export function setSubscriptionState(
  ctx: Context,
  ids: NilDid[],
  active: boolean,
): E.Effect<NilDid[], RepositoryError> {
  const filter: StrictFilter<OrganizationAccountDocument> = {
    _id: { $in: ids },
    _type: "organization",
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<OrganizationAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.updateMany(filter, {
        $set: { "subscription.active": active },
      });
      return result.modifiedCount === ids.length ? O.some(ids) : O.none();
    }),
    E.tap(() =>
      E.forEach(ids, (id) => E.sync(() => ctx.cache.accounts.taint(id))),
    ),
    succeedOrMapToRepositoryError({
      name: "AccountRepository.setSubscriptionState",
      filter,
    }),
  );
}
