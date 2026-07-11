# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Logger, ConsoleTransport, MemoryTransport, FunctionTransport, and NoOpTransport constructors are non-public (protected). All instances are created through `Class.create(options)` or `Class.builder().build()`, both of which validate configuration in the single protected constructor.
- LogBody and LogFault constructors are protected; `static create()` uses `new this()` for subclass-safe instantiation.
- BaseLogEntryBuilder has an explicit protected constructor that concrete subclasses funnel through.
- Five new builder classes: LoggerBuilder, ConsoleTransportBuilder, MemoryTransportBuilder, FunctionTransportBuilder, NoOpTransportBuilder — all exported from the package index and the relevant sub-barrels.

## [1.0.0] - 2026-06-23

### Added

- `Logger` core with pluggable `TransportInterface` port; a Logger with no transports is a valid silent logger
- `ConsoleTransport` — writes to console using a level-dispatch map; the only file permitted to use `console`
- `NoOpTransport` — discards all records, replacing the previous `NoOpLogger`
- `MemoryTransport` — captures `LogRecordType` records into an internal buffer; exposes `records()` and `clear()` for test assertion
- `FunctionTransport` — generic bridge adapter; passes each record to a user-supplied sink function, enabling integration with pino, winston, or any external logger
- Per-transport level filtering: each transport accepts an optional `level` option that acts as an independent floor above the Logger global floor
- `LogRecordType` — immutable record assembled at emit time, carrying `level`, `time` (milliseconds), `metadata`, and `data`
- `LoggerOptionsEntity` namespace — `Schema`, `Type`, and `validate` type guard for Logger configuration
- `./transports` package export entry for direct transport imports
- Fluent `LogBody` and `LogFault` builders retained with all required fields enforced at build time
- Child loggers via `.child(metadata)` for correlation ID injection from async context
