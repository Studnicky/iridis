# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `Patch` constructor is now `protected`; construct instances via `Patch.create(operations?)` (canonical entry point) or the existing static factories (`Patch.add`, `Patch.remove`, `Patch.replace`, `Patch.move`, `Patch.copy`, `Patch.test`, `Patch.combine`, `Patch.fromPlain`). Subclasses remain fully supported — `new this(...)` inside `make()` is unaffected.

## [1.0.0] - 2026-06-22

### Added

- `Clone.deep` / `Clone.shallow` — deep-clone with Map/Set/Date/Array support; shallow spreads a plain-object record.
- `Merge.deep` — V8-monomorphic deep merge; overlay wins on primitives, arrays replaced atomically, objects merged key-wise in alphabetical union order.
- `Path.toAccess` / `Path.get` — convert JSON Pointers to JS access notation and perform proto-pollution-safe dot-path reads with `[*]` wildcard support.
- `Sort.natural` / `Sort.longestFirst` / `Sort.shortestFirst`, `Hash.value`, `StructuralHash.of`, `DataType.deepEqual` / `DataType.isPlainObject` / `DataType.isRecord` / `DataType.hasCycle`, `Frozen.deepFreeze`, and instance-based `Patch` (RFC-6902 add/remove/replace/move/copy/test) with `PatchError`.
