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

  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}
