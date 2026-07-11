# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Wire` pure-static class with six type-safe accessors (`isRecord`, `asRecord`, `asString`, `asNumber`, `asStringOrNull`, `asRecordArray`) for narrowing `unknown` wire-format values without unsafe assertions
- `JsonValue`, `JsonObject` compile-time types for recursive readonly JSON-safe values and unvalidated JSON objects
- `DeepReadonly<T>` and `DeepMergeType<TBase, TOverlay>` generic utility types for recursive immutability and type-level deep merging
- `JsonSchema`, `JsonSchemaObject`, and `JsonSchemaTypeName` compile-time types modelling the JSON Schema 2020-12 vocabulary
