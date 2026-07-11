# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Mutex` constructor is `protected`; use `Mutex.create()` or `Mutex.builder()` to construct instances. Subclasses with implicit constructors remain publicly instantiable.
- `MutexBuilder` constructor is `private`; obtain a builder via `Mutex.builder()` or `MutexBuilder.create()`. Initial-config shorthand (`new MutexBuilder({ ... })`) is replaced by chained `.withMaxQueueSize()` / `.withTimeout()` / `.withCoalescing()` calls.
- `Mutex.create()` uses `new this()` internally so subclass factories return the correct subclass type.

### Added

- `Mutex.builder<K>()` static method returns a `MutexBuilder` for fluent configuration, replacing direct `new MutexBuilder()` construction.
- `MutexBuilder.create(factory)` static factory accepts an injected creation function, enabling subclass builders that produce the correct subclass type.

## [1.0.0] - 2026-06-22

### Added

- Key-based `Mutex<K>` class with per-key serialization: concurrent operations on different keys run in parallel, operations on the same key queue serially.
- Three acquisition modes: `acquire()` returning a manual release function, `acquireDisposable()` for `await using` syntax (Node.js 24+), and `runExclusive()` for automatic acquire/release around a callback.
- Protected lifecycle hooks (`beforeAcquire`, `afterAcquire`, `onContended`, `beforeRelease`, `afterRelease`, `onTimeout`) for subclass-level observability without coupling the base class to any logging or metrics library.
- `MutexBuilder<K>` fluent builder with `.withMaxQueueSize()`, `.withTimeout()`, and `.withCoalescing()` for declarative configuration; optional request coalescing collapses concurrent `runExclusive` calls on the same key into a single in-flight operation.
