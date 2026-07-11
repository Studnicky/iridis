# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `LruCache` constructor is `protected`; instances are constructed via `LruCache.create(options)` or `LruCache.builder().withCapacity(n).build()`.
- `LruCacheBuilder` provides a fluent API with `withCapacity()`, `withTtlMs()`, and `withPrefix()` setters.

## [1.0.0] - 2026-06-22

### Added

- `LruCache<K, V>` class: in-process LRU + TTL key-value store with O(1) promotion via doubly-linked list.
- `get(key)` returns `V | undefined`; promotes entry to MRU on hit, lazily evicts on expiry.
- `set(key, value, ttlMs?)` inserts or updates an entry with optional per-entry TTL override over the global default.
- `has(key)` checks existence without promoting; lazily evicts expired entries.
- `delete(key)` removes an entry and returns `true` on success, `false` if absent.
- `clear()` empties the cache and resets the linked list.
- `size` getter reflecting the current entry count.
- `LruCacheOptions` interface with `capacity`, optional `ttlMs`, and optional `prefix` fields.
- Optional `prefix` namespaces stored keys using `prefix:key` form; unprefixed and prefixed instances are independent.
- No background sweep, no timers — all TTL checks are lazy on access.
