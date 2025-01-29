import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter } from "mongodb";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";
import type {
  AccountDocument,
  AdminAccountDocument,
  AdminCreateAccountRequest,
} from "./admin.types";

export function toAdminAccountDocument(
  data: AdminCreateAccountRequest,
): AdminAccountDocument {
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

export function deleteOneById(
  ctx: AppBindings,
  _id: NilDid,
): E.Effect<NilDid, RepositoryError> {
  const filter: StrictFilter<AccountDocument> = {
    _id,
  };

  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.deleteOne(filter);
      return result.deletedCount === 1 ? O.some(_id) : O.none();
    }),
    succeedOrMapToRepositoryError({
      name: "AdminAccountRepository.deleteOneById",
      filter,
    }),
  );
}

export function findById(
  ctx: AppBindings,
  _id: NilDid,
): E.Effect<AccountDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.findOne({ _id });
      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "AdminAccountRepository.findById",
      _id,
    }),
  );
}

export function insert(
  ctx: AppBindings,
  document: AdminAccountDocument,
): E.Effect<NilDid, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.primary.collection<AdminAccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.insertOne(document);
      return result.insertedId;
    }),
    succeedOrMapToRepositoryError({
      op: "AdminAccountRepository.insert",
      document,
    }),
  );
}

export function listAll(
  ctx: AppBindings,
): E.Effect<AccountDocument[], RepositoryError> {
  return pipe(
    E.tryPromise(() => {
      // Skip cache.accounts check because this isn't perf sensitive
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      return collection.find({}).toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "AdminAccountRepository.listAll",
    }),
  );
}
