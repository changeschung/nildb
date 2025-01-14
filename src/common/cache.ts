import { Effect as E, Option as O, pipe } from "effect";
import type { AccountDocument } from "#/admin/repository";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import { CollectionName } from "#/common/mongo";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

type CacheValue<V> = {
  value: V;
  expires: number;
};

const DEFAULT_TTL = 1000 * 60;

export class Cache<K, V> {
  private cache = new Map<K, CacheValue<V>>();
  constructor(private ttlMs = DEFAULT_TTL) {}

  set(key: K, value: V, ttl?: number): void {
    let expires = ttl ? ttl : this.ttlMs;
    expires += Date.now();

    this.cache.set(key, {
      value,
      expires,
    });
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  taint(key: K): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.expires = Date.now() - 1;
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
