# @studnicky/cache

> Capacity-bounded LRU cache with per-entry and default TTL, O(1) promotion on read.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/cache)

A lightweight, generic LRU (Least Recently Used) cache with optional time-to-live support. Entries are evicted when the cache reaches capacity, always removing the least-recently-used entry first. TTL expiry is lazy — expired entries are evicted on access rather than via a background timer.

Each entry can carry its own TTL, overriding the cache-level default. This makes the cache suitable for mixed workloads where some data expires quickly and other data is long-lived.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/cache
```

## Usage

```typescript
import { LruCache } from '@studnicky/cache';

// 1. Basic set/get — construct via LruCache.create()
const cache = LruCache.create<string, number>({ capacity: 100 });

cache.set('hits', 42);
const hits = cache.get('hits'); // 42

// 2. Via builder — fluent API
const built = LruCache.builder<string, number>()
  .withCapacity(100)
  .build();

built.set('hits', 42);

// 3. Default TTL — all entries expire after 5 seconds unless overridden
const ttlCache = LruCache.create<string, string>({ capacity: 50, ttlMs: 5_000 });

ttlCache.set('session', 'abc123');
const session = ttlCache.get('session'); // 'abc123' (within 5s)

// Via builder with TTL
const ttlBuilt = LruCache.builder<string, string>()
  .withCapacity(50)
  .withTtlMs(5_000)
  .build();

// 4. Per-entry TTL override — this entry expires after 1 second regardless of cache default
ttlCache.set('shortLived', 'temp', 1_000);

// 5. Bulk insert — entries are inserted in argument order; the last entry is MRU
const batch = LruCache.create<string, number>({ capacity: 3 });
batch.setMany([['a', 1], ['b', 2], ['c', 3]]);
// Adding more entries evicts the oldest-by-arg-order first ('a', then 'b')
batch.setMany([['d', 4], ['e', 5]]);
// batch.get('a') === undefined (evicted); batch.get('e') === 5

// Batch TTL applies to every entry in the call
const timed = LruCache.create<string, string>({ capacity: 10 });
timed.setMany([['x', 'one'], ['y', 'two']], 5_000); // both expire in 5 s

// 6. has, delete, clear, size
const store = LruCache.create<string, boolean>({ capacity: 10 });

store.set('flag', true);
store.has('flag');    // true
store.size;           // 1

store.delete('flag'); // true (entry existed)
store.has('flag');    // false

store.set('a', true);
store.set('b', true);
store.clear();
store.size;           // 0
```

## License

MIT
