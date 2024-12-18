import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, UUID } from "mongodb";
import type { RepositoryError } from "#/common/error";
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
  schemas: UUID[];
  queries: UUID[];
};

function toOrganizationAccountDocument(
  data: RegisterAccountRequest,
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
    schemas: [],
    queries: [],
  };
}

function insert(
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

function findOne(
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

function deleteOneById(
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
    succeedOrMapToRepositoryError({
      name: "AccountRepository.deleteOne",
      filter,
    }),
  );
}

export const AccountRepository = {
  toOrganizationAccountDocument,
  deleteOneById,
  findOne,
  insert,
};
