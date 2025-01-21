import { Effect as E, Option as O, pipe } from "effect";
import { Temporal } from "temporal-polyfill";
import type { AccountDocument } from "#/admin/repository";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

type CacheValue<V> = {
  value: V;
  expires: Temporal.Instant;
};

const DEFAULT_TTL = Temporal.Duration.from({ minutes: 1 });

export class Cache<K, V> {
  private _db = new Map<K, CacheValue<V>>();
  constructor(private ttl = DEFAULT_TTL) {}

  set(key: K, value: V): void {
    const expires = Temporal.Now.instant().add(this.ttl);

    this._db.set(key, {
      value,
      expires,
    });
  }

  get(key: K): V | null {
    const entry = this._db.get(key);
    if (!entry) return null;

    const now = Temporal.Now.instant();
    const expired = Temporal.Instant.compare(now, entry.expires) > 0;

    if (expired) {
      this._db.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: K): boolean {
    return this._db.delete(key);
  }

  taint(key: K): void {
    const entry = this._db.get(key);
    if (entry) {
      entry.expires = Temporal.Instant.fromEpochSeconds(0);
    }
  }
}

export function findAccountByIdWithCache(
  ctx: Context,
  _id: NilDid,
): E.Effect<AccountDocument, RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const accountsCache = ctx.cache.accounts;

      const account = accountsCache.get(_id as NilDid);
      if (account) {
        return O.some(account);
      }

      // Cache miss search database
      const collection = ctx.db.primary.collection<AccountDocument>(
        CollectionName.Accounts,
      );
      const result = await collection.findOne({ _id });

      if (result) {
        accountsCache.set(result._id, result);
        O.some(result);
      }

      return O.fromNullable(result);
    }),
    succeedOrMapToRepositoryError({
      op: "AuthMiddleware.findAccountById",
      _id,
    }),
  );
}
