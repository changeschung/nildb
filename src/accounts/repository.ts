import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export type AccountDocument =
  | RootAccountDocument
  | AdminAccountDocument
  | OrganizationAccountDocument;

export type AccountType = "root" | "admin" | "organization";

export type RootAccountDocument = {
  _id: NilDid;
  _type: "root";
  publicKey: string;
};

export type AdminAccountDocument = {
  _id: NilDid;
  _type: "admin";
  _created: Date;
  _updated: Date;
  publicKey: string;
  name: string;
};

export type OrganizationAccountDocument = {
  _id: NilDid;
  _type: "organization";
  _created: Date;
  _updated: Date;
  publicKey: string;
  name: string;
  schemas: UUID[];
  queries: UUID[];
};

export function toAdminAccountDocument(data: {
  type: "admin";
  did: NilDid;
  publicKey: string;
  name: string;
}): AdminAccountDocument {
  const { did, publicKey, name } = data;
  const now = new Date();

  return {
    _id: did,
    _type: "admin",
    _created: now,
    _updated: now,
    publicKey,
    name,
  };
}

export function toOrganizationAccountDocument(data: {
  type: "organization";
  did: NilDid;
  publicKey: string;
  name: string;
}): OrganizationAccountDocument {
  const { did, publicKey, name } = data;
  const now = new Date();

  return {
    _id: did,
    _type: "organization",
    _created: now,
    _updated: now,
    publicKey,
    name,
    schemas: [],
    queries: [],
  };
}

export function accountsInsert(
  ctx: Context,
  document: AdminAccountDocument | OrganizationAccountDocument,
): E.Effect<NilDid, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToRepositoryError({
      op: "accountsInsert",
      document,
    }),
  );
}

export function accountsFindOne(
  ctx: Context,
  filter: StrictFilter<AccountDocument>,
): E.Effect<AccountDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const accountsCache = ctx.cache.accounts;
      // Try cache to avoid db query
      if (filter._id) {
        const account = accountsCache.get(filter._id as NilDid);
        if (account) return O.some(account);
      }

      // Cache miss search database
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.findOne(filter);

      if (result) {
        accountsCache.set(result._id, result);
      }

      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "accountsFindOne",
      filter,
    }),
  );
}

export function accountsFind(
  ctx: Context,
  filter: StrictFilter<AccountDocument>,
): E.Effect<AccountDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      // Skip cache.accounts check because this isn't perf sensitive
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      return collection.find(filter).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "accountsFind",
      filter,
    }),
  );
}

export function accountsDeleteOne(
  ctx: Context,
  filter: StrictFilter<AccountDocument>,
): E.Effect<AccountDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.findOneAndDelete(filter);
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      name: "accountsDeleteOne",
      params: { filter },
    }),
  );
}
